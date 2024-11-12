const Poppler = require('pdf-poppler');
const path = require('path');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');
const { base64String } = require('./base64String');

// Function to convert Base64 string to a PDF file
function base64ToPdf(base64String, outputPath) {
    const pdfBuffer = Buffer.from(base64String, 'base64');
    fs.writeFileSync(outputPath, pdfBuffer);
    console.log(`PDF file created from Base64 string at ${outputPath}`);
}

// Convert PDF to images
async function pdfToImages(pdfFilePath) {
    const outputDir = path.join(__dirname, 'output-images');

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    let options = {
        format: 'png',
        out_dir: outputDir,
        out_prefix: path.basename(pdfFilePath, path.extname(pdfFilePath)),
        page: null,  // convert all pages
        resolution: 600  // Set DPI to 600 for higher quality
    };

    try {
        await Poppler.convert(pdfFilePath, options);
        console.log('PDF successfully converted to high-quality images.');
        return fs.readdirSync(outputDir).map(file => path.join(outputDir, file));
    } catch (error) {
        console.error('Error converting PDF to images: ', error);
    }
}

// Convert images to PDF (enhancing quality)
async function imagesToPdf(imagePaths, outputPdfPath) {
    const pdfDoc = await PDFDocument.create();

    for (const imagePath of imagePaths) {
        const imageBuffer = fs.readFileSync(imagePath);

        // Apply sharp to enhance quality
        const enhancedImage = await sharp(imageBuffer)
            .jpeg({ quality: 95 })  // Convert to JPEG with high quality
            .toBuffer();

        // Embed the image in the PDF with its full resolution
        const pngImage = await pdfDoc.embedJpg(enhancedImage);

        const page = pdfDoc.addPage([pngImage.width, pngImage.height]);
        page.drawImage(pngImage, {
            x: 0,
            y: 0,
            width: pngImage.width,
            height: pngImage.height
        });
    }

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPdfPath, pdfBytes);
    console.log(`Images successfully converted back to a high-quality PDF: ${outputPdfPath}`);
    return pdfBytes; // Return the PDF bytes for Base64 conversion
}

// Function to convert PDF bytes to Base64 string
function pdfToBase64(pdfBytes) {
    return Buffer.from(pdfBytes).toString('base64');
}

// Function to save Base64 string to a text file
function saveBase64ToFile(base64String, outputPath) {
    fs.writeFileSync(outputPath, base64String);
    console.log(`Base64 string saved to ${outputPath}`);
}

// Function to delete the `output-images` and `output` folders
function deleteFolder(folderPath) {
    fs.rmSync(folderPath, { recursive: true, force: true });
    console.log(`Deleted folder: ${folderPath}`);
}

// Function to handle the complete process: Base64 -> PDF -> Images -> PDF -> Base64
async function processBase64ToPdfAndBack(base64String) {
    const pdfFilePath = path.join(__dirname, 'example.pdf');
    
    // Convert Base64 string to PDF
    base64ToPdf(base64String, pdfFilePath);

    try {
        // Convert PDF to high-quality images
        const imagePaths = await pdfToImages(pdfFilePath);
        if (!imagePaths || imagePaths.length === 0) {
            throw new Error('No images were generated from the PDF.');
        }

        // Output PDF path
        const outputPdfPath = path.join(__dirname, 'output', 'recreated_high_quality.pdf');

        // Ensure output directory exists
        if (!fs.existsSync(path.join(__dirname, 'output'))) {
            fs.mkdirSync(path.join(__dirname, 'output'));
        }

        // Convert images back to PDF with high quality
        const pdfBytes = await imagesToPdf(imagePaths, outputPdfPath);

        // Convert PDF to Base64
        const base64StringRecreated = pdfToBase64(pdfBytes);
        console.log('Base64 string of the recreated PDF:', base64StringRecreated);

        // Save the Base64 string to a text file
        const base64OutputPath = path.join(__dirname, 'output', 'pdf_base64.txt');
        saveBase64ToFile(base64StringRecreated, base64OutputPath);

        // Delete the `output-images` folder after the process
        const outputImagesFolderPath = path.join(__dirname, 'output-images');
        deleteFolder(outputImagesFolderPath);

        // Delete the `output` folder after the process
        const outputFolderPath = path.join(__dirname, 'output');
        deleteFolder(outputFolderPath);

        return base64StringRecreated; // Optionally return the Base64 string
    } catch (error) {
        console.error('Error in conversion process: ', error);
    }
}

// Example Base64 string (you would replace this with the actual string from the frontend)
const exampleBase64String = base64String; // Truncated for example

// Call the function to perform the conversion
processBase64ToPdfAndBack(exampleBase64String);
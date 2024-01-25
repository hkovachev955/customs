const express = require('express');
const sharp = require('sharp');
const fs = require('fs').promises;

const app = express();
const port = 3000;

const generateImage = async () => {
    try {
        // Modify this array with the paths of your WebP images
        const imagePaths = [
            'full/base_npc/base-npc.webp',
            'full/mood/angry.webp',
            // Add more image paths as needed
        ];

        if (imagePaths.length < 2) {
            throw new Error('At least two images are required.');
        }

        // Read and process the first image to get dimensions
        const firstImageBuffer = await fs.readFile(imagePaths[0]);
        const { width, height } = await sharp(firstImageBuffer).metadata();

        // Create a blank canvas with a white background
        const canvas = sharp({
            create: {
                width,
                height: height * imagePaths.length,
                channels: 4, // WebP typically has an alpha channel
                background: { r: 255, g: 255, b: 255, alpha: 1 },
            },
        });

        // Composite images onto the canvas
        let y_offset = 0;
        // Composite images onto the canvas
        for (const imagePath of imagePaths) {
            const imageBuffer = await fs.readFile(imagePath);

            canvas.composite([{
                input: imageBuffer,
                top: 0,
                left: 0
            }]);
        }
        // Convert the canvas to a buffer
        const imageBuffer = await canvas.jpeg().toBuffer();

        return imageBuffer;
    } catch (error) {
        console.error(error);
        throw error;
    }
};

app.get('/generate-image', async (req, res) => {
    try {
        // Generate image based on parameters
        const imageBuffer = await generateImage();

        // Set response headers
        res.header('Content-Type', 'image/jpeg');

        // Send the generated image buffer
        res.send(imageBuffer);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

const express = require('express');
const sharp = require("sharp");
const fs = require('fs').promises; // Include the fs module


const app = express();
const port = 3000; // Change this to the desired port number

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

        // Read and process images using Sharp
        const imageBuffers = await Promise.all(imagePaths.map(imagePath => fs.readFile(imagePath)));

        // Determine the maximum width and total height among the images
        let maxWidth = 0;
        let totalHeight = 0;

        for (const imageBuffer of imageBuffers) {
            const metadata = await sharp(imageBuffer).metadata();
            maxWidth = Math.max(maxWidth, metadata.width);
            totalHeight += metadata.height;
        }

        // Create a new input image with the determined dimensions
        const resultImage = await sharp({
            create: {
                width: maxWidth,
                height: totalHeight,
                channels: 4,
                background: { r: 255, g: 255, b: 255, alpha: 1 },
            },
        });

        // Composite images onto the new input image
        let y_offset = 0;
        for (const imageBuffer of imageBuffers) {
            resultImage.composite([{ input: imageBuffer, top: y_offset, left: 0 }]);
            y_offset += (await sharp(imageBuffer).metadata()).height;
        }

        // Convert the sharp object to a buffer
        const imageBuffer = await resultImage.webp().toBuffer();

        return imageBuffer;
    } catch (error) {
        console.error(error);
        throw error;
    }
};

// const generateImage = async () => {
//     // Your image generation logic here
//     // Use the sharp library or any other image processing library

//     // For demonstration purposes, let's create a simple blank image
//     // const imageBuffer = await sharp({
//     //   create: {
//     //     width: 300,
//     //     height: 300,
//     //     channels: 4,
//     //     background: { r: 255, g: 255, b: 255, alpha: 1 },
//     //   },
//     // })
//     //   .png()
//     //   .toBuffer();


//     const imagePaths = [
//         'full/base_npc/base-npc.webp',
//         'full/mood/angry.webp'
//         // Add more image paths as needed
//     ];

//     if (imagePaths.length < 2) {
//         return res.status(400).json({ error: 'At least two images are required.' });
//     }

//     // Read and process images using Sharp
//     const imageBuffers = await Promise.all(imagePaths.map(imagePath => fs.readFile(imagePath)));
//     const resultImage = await sharp({
//         create: {
//             width: (await sharp(imageBuffers[0]).metadata()).width,
//             height: imageBuffers.reduce((acc, imgBuffer) => acc + (sharp(imgBuffer).metadata()).height, 0),
//             // width: 400,
//             // height: 400,
//             channels: 3,
//             background: { r: 255, g: 255, b: 255, alpha: 1 },
//         },
//     });

//     let y_offset = 0;
//     for (const imageBuffer of imageBuffers) {
//         resultImage.composite([{ input: imageBuffer, top: y_offset, left: 0 }]);
//         y_offset += (await sharp(imageBuffer).metadata()).height;
//     }

//     const imageBuffer = await resultImage.webp().toBuffer();

//     return imageBuffer;
// };


app.get("/generate-image", async (req, res) => {
    try {
        // Extract parameters from query string
        const { selectedItems } = req.query;

        // Convert JSON string to an object
        const parsedSelectedItems = JSON.parse(selectedItems);

        // Generate image based on parameters
        const imageBuffer = await generateImage();

        // Set response headers
        res.set("Content-Type", "image/webp");
        //   res.header('Content-Type', 'image/webp');
        // Send the generated image
        res.send(imageBuffer);
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});

// app.get('/stack_images', async (res) => {
//     try {
//         // Modify this array with the paths of your images
//         const imagePaths = [
//             'path/to/image1.jpg',
//             'path/to/image2.jpg',
//             // Add more image paths as needed
//         ];

//         if (imagePaths.length < 2) {
//             return res.status(400).json({ error: 'At least two images are required.' });
//         }

//         // Read and process images using Sharp
//         const imageBuffers = await Promise.all(imagePaths.map(imagePath => fs.readFile(imagePath)));
//         const resultImage = await sharp({
//             create: {
//                 width: (await sharp(imageBuffers[0]).metadata()).width,
//                 height: imageBuffers.reduce((acc, imgBuffer) => acc + (sharp(imgBuffer).metadata()).height, 0),
//                 channels: 3,
//                 background: { r: 255, g: 255, b: 255, alpha: 1 },
//             },
//         });

//         let y_offset = 0;
//         for (const imageBuffer of imageBuffers) {
//             resultImage.composite([{ input: imageBuffer, top: y_offset, left: 0 }]);
//             y_offset += (await sharp(imageBuffer).metadata()).height;
//         }

//         // Save or return the result image
//         const resultImagePath = 'result_image.jpg';
//         await resultImage.toFile(resultImagePath);  // Save the result image (optional)
//         res.sendFile(resultImagePath);
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: 'Internal Server Error' });
//     }
// });

// app.get('/generate-image', (req, res) => {
//   // Extract traits from request parameters
//   const { trait1, trait2 } = req.query;

//   // Generate the image based on traits
//   const canvas = createCanvas(400, 400);
//   const ctx = canvas.getContext('2d');
//   ctx.fillStyle = 'red';
//   ctx.fillRect(0, 0, 400, 400);

//   // Stream the image as a response
//   res.setHeader('Content-Type', 'image/png');
//   canvas.createPNGStream().pipe(res);
// });

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});



// const express = require("express");
// const app = express();
// const { createCanvas, loadImage } = require("canvas");

// app.use(express.json());

// app.post("/generate-image", async (req, res) => {
//   const { selectedItems } = req.body;

//   // Generate the image using the selectedItems data
//   const canvas = createCanvas(300, 300);
//   const ctx = canvas.getContext("2d");

//   // Draw the base NPC image
//   const baseNpcImage = await loadImage(`./full/base_npc`);
//   ctx.drawImage(baseNpcImage, 0, 0, 300, 300);

//   // Draw the additional selected items
//   const keys = Object.keys(selectedItems);
//   for (const key of keys) {
//     if (key !== "base_npc" && selectedItems[key] && selectedItems[key] !== "neutral") {
//       const itemImage = await loadImage(`./path/to/${selectedItems[key]}.png`);
//       ctx.drawImage(itemImage, 0, 0, 45, 45);
//     }
//   }

//   // Get the image as a data URL
//   const imageUrl = canvas.toDataURL();

//   // Return the image URL to the client
//   res.json({ imageUrl });
// });

// app.listen(3000, () => {
//   console.log("Server is running on port 3000");
// });
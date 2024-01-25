const express = require('express');
const Canvas = require('@napi-rs/canvas');
const { Web3 } = require('web3');
const contractAbi = require('./contract/abi.json')
const web3 = new Web3("https://rpc2.sepolia.org");
const contractAddress = "0x494328Eef4b5df5aE9a38aE6aDD1c26100042A3c";
const npcCustoms = new web3.eth.Contract(contractAbi, contractAddress);
const {
    DIR_NAMES_TO_SECTION_NAMES,
    DIR_NAMES_ARRAY,
    SECTION_NAMES_TO_DIR_NAMES,
    BASE_NPC_ITEM_NAMES,
    MOOD_ITEM_NAMES,
    BACKGROUND_ITEM_NAMES,
    TORSO_ITEM_NAMES,
    FACE_SLOT_1_ITEM_NAMES,
    FACE_SLOT_2_ITEM_NAMES,
    PIERCINGS_ITEM_NAMES,
    EYEWEAR_GLASSES_ITEM_NAMES,
    HAIRSTYLE_HATS_ITEM_NAMES,
    ITEM_ITEM_NAMES,
    DIR_NAMES_TO_ITEM_NAMES,
    allItems
} = require('./items.js');

const {
    pathToName,
    itemNameToImgUrl,
    itemNamesToItems,
    isSafari
} = require('./utils.js');

const app = express();
const port = 3000;

async function getTraits(id) {
    try {
        var myObjectWithBigInts = await npcCustoms.methods.tokenTraitsById(id).call();
        var myObjectWithInts = {};
        for (const key in myObjectWithBigInts) {
            if (Object.hasOwnProperty.call(myObjectWithBigInts, key)) {
                myObjectWithInts[key] = Number(myObjectWithBigInts[key]);
            }
        }
        const keysToKeep = Object.keys(myObjectWithInts).slice(-9);
        const newObject = keysToKeep.reduce((acc, key) => {
            acc[key] = myObjectWithInts[key];
            return acc;
        }, {});
        console.log(newObject)
        return newObject;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

async function buildJson(npcTraits, tokenId) {
    try {
        var traits = [];
        for (const key of Object.keys(npcTraits)) {
            const itemArray = getCorrespondingItemArray(key);
            const itemName = itemArray[npcTraits[key]];
            traits.push(itemName);
        }
        const data = {
            'name': 'NPC Custom #' + tokenId,
            'attributes': {
              'Background': traits[0],
              'Mood': traits[1],
              'Torso': traits[2],
              'Face Slot #1' : traits[3],
              'Face Slot #2' : traits[4],
              'Piercings' : traits[5],
              'Eyewear & Glasses' : traits[6],
              'Hairstyle & Hats' : traits[7],
              'Item' : traits[8]
              
            },
            'image': `http://localhost:${port}/Image?Id=${tokenId}`
          }
        return data;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

async function buildImage(npcTraits) {
    try {
        var images = [];
        for (const key in npcTraits) {
            if (npcTraits[key] === 0 && !key.includes("background")) {
                delete npcTraits[key];
            }
        }
        for (const key of Object.keys(npcTraits)) {
            const sectionDirName = SECTION_NAMES_TO_DIR_NAMES[key];
            const itemArray = getCorrespondingItemArray(key);
            const itemName = itemArray[npcTraits[key]];
            console.log(sectionDirName, itemName);
            const imageUrl = `full${itemNameToImgUrl(sectionDirName, itemName)}.webp`;
            if (imageUrl !== "full/mood/neutral.webp") {
                console.log(imageUrl);
                images.push(imageUrl);
            }
        }
        const imagePromises = images.map(imageUrl => Canvas.loadImage(imageUrl));
        const loadedImages = await Promise.all(imagePromises);

        const canvas = Canvas.createCanvas(1000, 1000);
        const context = canvas.getContext('2d');

        context.drawImage(loadedImages[0], 0, 0);

        const base_npc_filename = await Canvas.loadImage('full/base_npc/base-npc.webp');
        context.drawImage(base_npc_filename, 0, 0);

        for (var i = 1; i < loadedImages.length; i++) {
            context.drawImage(loadedImages[i], 0, 0);
        }

        const buffer = canvas.toBuffer("image/webp");
        return buffer;

    } catch (error) {
        console.error(error);
        throw error;
    }
}
function getCorrespondingItemArray(sectionName) {
    switch (sectionName) {
        case 'background':
            return BACKGROUND_ITEM_NAMES;
        case 'mood':
            return MOOD_ITEM_NAMES;
        case 'torso':
            return TORSO_ITEM_NAMES;
        case 'faceSlot1':
            return FACE_SLOT_1_ITEM_NAMES;
        case 'faceSlot2':
            return FACE_SLOT_2_ITEM_NAMES;
        case 'piercings':
            return PIERCINGS_ITEM_NAMES;
        case 'eyewearAndGlasses':
            return EYEWEAR_GLASSES_ITEM_NAMES;
        case 'hairstyleAndHats':
            return HAIRSTYLE_HATS_ITEM_NAMES;
        case 'item':
            return ITEM_ITEM_NAMES;
        default:
            throw new Error(`Unsupported section: ${sectionName}`);
    }
}

app.get('/Metadata', async (req, res) => {
    try {
        // Extract parameters from query string
        const { Id } = req.query;
        // Convert JSON string to an object
        const parsedSelectedItems = await getTraits(Id);
        var data = await buildJson(parsedSelectedItems, Id);
        res.send(data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


app.get('/Image', async (req, res) => {
    try {

        // Extract parameters from query string
        const { Id } = req.query;
        // Convert JSON string to an object
        const parsedSelectedItems = await getTraits(Id);
        //Build the image
        const imageBuffer = await buildImage(parsedSelectedItems);
        // Set response headers
        res.header('Content-Type', 'image/png');
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
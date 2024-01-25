const express = require('express');
const Canvas = require('@napi-rs/canvas');
const { Web3 } = require('web3');
const contractAbi = require('./contract/abi.json');
const items = require('./items.js');
const utils = require('./utils.js');

const app = express();
const port = 3000;

// Configuration
const config = {
    contractAddress: "0xB2b921501b6244cB6e62dbf171Cc81D17E74b6c5",
    web3ProviderUrl: "https://rpc2.sepolia.org",
    port: 3000,
};

const web3 = new Web3(config.web3ProviderUrl);
const npcCustoms = new web3.eth.Contract(contractAbi, config.contractAddress);

const sectionNames = {
    'background': items.BACKGROUND_ITEM_NAMES,
    'mood': items.MOOD_ITEM_NAMES,
    'torso': items.TORSO_ITEM_NAMES,
    'faceSlot1': items.FACE_SLOT_1_ITEM_NAMES,
    'faceSlot2': items.FACE_SLOT_2_ITEM_NAMES,
    'piercings': items.PIERCINGS_ITEM_NAMES,
    'eyewearAndGlasses': items.EYEWEAR_GLASSES_ITEM_NAMES,
    'hairstyleAndHats': items.HAIRSTYLE_HATS_ITEM_NAMES,
    'item': items.ITEM_ITEM_NAMES
};

const getCorrespondingItemArray = (sectionName) => {
    const itemArray = sectionNames[sectionName];
    if (!itemArray) {
        throw new Error(`Unsupported section: ${sectionName}`);
    }
    return itemArray;
};

const handleError = (error, res) => {
    console.error(error);
    res.status(500).send('Internal Server Error');
};

const getTraits = async (id) => {
    try {
        const myObjectWithBigInts = await npcCustoms.methods.tokenTraitsById(id).call();
        const myObjectWithInts = {};
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
        console.log(newObject);
        return newObject;
    } catch (error) {
        throw error;
    }
};

const filterTraits = (traits) => {
    const filteredTraits = { ...traits };

    Object.keys(filteredTraits).forEach(key => {
        if (filteredTraits[key] === 0 && !key.includes("background")) {
            delete filteredTraits[key];
        }
    });

    return filteredTraits;
}

const loadImages = async (imageUrls) => {
    const imagePromises = imageUrls.map(url => Canvas.loadImage(url));
    return await Promise.all(imagePromises);
}

const getImageUrls = (traits) => {

    const images = [];

    Object.keys(traits).forEach(key => {
        const sectionDir = items.SECTION_NAMES_TO_DIR_NAMES[key];
        const itemArray = getCorrespondingItemArray(key);
        const itemName = itemArray[traits[key]];

        const imageUrl = `full${utils.itemNameToImgUrl(sectionDir, itemName)}.webp`;
        if (imageUrl !== 'full/mood/neutral.webp') {
            images.push(imageUrl);
        }

    });

    return images;

}

const buildImage = async (npcTraits) => {
    try {
        const filteredTraits = filterTraits(npcTraits);

        const images = getImageUrls(filteredTraits);
        console.log(images);
        const loadedImages = await loadImages(images);

        const canvas = Canvas.createCanvas(1000, 1000);
        const context = canvas.getContext('2d');

        context.drawImage(loadedImages[0], 0, 0);

        const base_npc_filename = await Canvas.loadImage('full/base_npc/base-npc.webp');
        context.drawImage(base_npc_filename, 0, 0);

        for (var i = 1; i < loadedImages.length; i++) {
            context.drawImage(loadedImages[i], 0, 0);
        }
        const buffer = canvas.toBuffer("image/png");
        return buffer;

    } catch (err) {
        throw err;
    }

}

async function buildJson(npcTraits, tokenId) {
    try {
        const traits = Object.entries(npcTraits).map(([key, value]) => {
            const itemArray = getCorrespondingItemArray(key);
            return itemArray[value];
        });
        const [bg, mood, torso, face1, face2, piercings, eyewear, hair, item] = traits;
        const attributes = {
            'Background': bg,
            'Mood': mood,
            'Torso': torso,
            'Face Slot #1': face1,
            'Face Slot #2': face2,
            'Piercings': piercings,
            'Eyewear & Glasses': eyewear,
            'Hairstyle & Hats': hair,
            'Item': item
        };
        const data = {
            'name': `NPC Custom #${tokenId}`,
            attributes,
            'image': `https://customs.onrender.com/Image?Id=${tokenId}`
        };

        return data;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

app.get('/Metadata', async (req, res) => {
    try {
        const { Id } = req.query;
        const parsedSelectedItems = await getTraits(Id);
        const data = await buildJson(parsedSelectedItems, Id);
        res.send(data);
    } catch (error) {
        handleError(error, res);
    }
});

app.get('/Image', async (req, res) => {
    try {
        const { Id } = req.query;
        const parsedSelectedItems = await getTraits(Id);
        const imageBuffer = await buildImage(parsedSelectedItems);
        res.header('Content-Type', 'image/png');
        res.send(imageBuffer);
    } catch (error) {
        handleError(error, res);
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

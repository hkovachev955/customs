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
    contractAddress: "0x494328Eef4b5df5aE9a38aE6aDD1c26100042A3c",
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
    // ... other sections
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
            'image': `http://localhost:${port}/Image?Id=${tokenId}`
          };

        return data;
    } catch (error) {
        console.error(error);
        throw error;
    }
}
// async function buildJson(npcTraits, tokenId) {
//     try {
//         console.log("npcTraits:", npcTraits);

//         const traits = Object.keys(sectionNames).map((key, index) => {
//             const itemArray = getCorrespondingItemArray(key);
//             console.log("Processing section", key, "with itemArray:", itemArray);
//             console.log("npcTraits[key]:", npcTraits[key]);

//             const traitIndex = npcTraits[key];
//             if (traitIndex !== null && traitIndex !== undefined) {
//                 if (traitIndex < 0 || traitIndex >= itemArray.length) {
//                     console.error(`Invalid index ${traitIndex} for section ${key}`);
//                     return null; // or handle it appropriately
//                 }
//                 return itemArray[traitIndex];
//             } else {
//                 console.error(`Trait index is null or undefined for section ${key}`);
//                 return null; // or handle it appropriately
//             }
//         });

//         console.log("traits:", traits);

//         const data = {
//             'name': `NPC Custom #${tokenId}`,
//             'attributes': Object.fromEntries(Object.keys(sectionNames).map((key, index) => [utils.DIR_NAMES_TO_SECTION_NAMES[index], traits[index]])),
//             'image': `http://localhost:${port}/Image?Id=${tokenId}`
//         };

//         return data;
//     } catch (error) {
//         console.error(error);
//         throw error;
//     }
// }



const buildImage = async (npcTraits) => {
    try {
        var images = [];
        for (const key in npcTraits) {
            if (npcTraits[key] === 0 && !key.includes("background")) {
                delete npcTraits[key];
            }
        }
        for (const key of Object.keys(npcTraits)) {
            const sectionDirName = items.SECTION_NAMES_TO_DIR_NAMES[key];
            const itemArray = getCorrespondingItemArray(key);
            const itemName = itemArray[npcTraits[key]];
            console.log(sectionDirName, itemName);
            const imageUrl = `full${utils.itemNameToImgUrl(sectionDirName, itemName)}.webp`;
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

        const buffer = canvas.toBuffer("image/png");
        return buffer;
    } catch (error) {
        throw error;
    }
};

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

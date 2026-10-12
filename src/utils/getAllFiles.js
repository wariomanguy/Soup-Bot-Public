const fs = require('fs');
const path = require('path');

function getAllFiles(directory, foldersOnly = false) {
    let results = [];

    const files = fs.readdirSync(directory, { withFileTypes: true });

    for (const file of files) {
        const filePath = path.join(directory, file.name);

        if (file.isDirectory()) {
            if (foldersOnly) {
                results.push(filePath);
            }

            // recurse
            results = results.concat(getAllFiles(filePath, foldersOnly));
        } else {
            if (!foldersOnly && file.name.endsWith('.js')) {
                results.push(filePath);
            }
        }
    }

    return results;
}

module.exports = getAllFiles;


//OLD:
// const { dir } = require('console');
// const fs = require('fs');
// const path = require('path');

// module.exports = (directory, foldersOnly = false) => {
//     let fileNames = [];

//     const files = fs.readdirSync(directory, {withFileTypes: true});

//     for (const file of files) {
//         //console.log("Checking file:", file.name, "isDirectory:", file.isDirectory(), "isFile:", file.isFile());
//         const filePath = path.join(directory, file.name);

//         if (foldersOnly) {
//             if (file.isDirectory()) {
//                 fileNames.push(filePath);
//             }
//         } else {
//             console.log("Adding file:", filePath);
//             if (file.isFile() && file.name.endsWith('.js')) {
//                 //console.log("Adding file:", filePath);
//                 fileNames.push(filePath);
//             }
//         }
//     }

//     return fileNames;
// }
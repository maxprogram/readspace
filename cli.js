#!/usr/bin/env node

const { search_similar, build_db } = require('./db.js');
const readline = require('readline');


const main = async () => {

    await build_db();

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    while (true) {
        const query = await new Promise((resolve, reject) => {
            rl.question('\nQuery: ', resolve);
        });
        const matches = await search_similar(query);
        console.log('');
        for (const match of matches.slice(0, 5)) {
            console.log(match.text);
            console.log('Score: ' + match.score);
            console.log('Book: ' + match.book);
            console.log('Author: ' + match.author);
            console.log('');
        }
    }
}

main();

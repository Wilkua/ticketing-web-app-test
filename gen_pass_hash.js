const crypto = require('crypto');

const argv = process.argv;

if (argv.length < 3) {
    console.error('Need password');
    process.exit(1);
}

const password = argv[2];

let iterations = 155134;
if (argv.length >= 4) {
    iterations = parseInt(argv[3], 10);
}

let algo = 'sha512';
if (argv.length >= 5) {
    algo = argv[4];
}

let keyLen = 64;
if (argv.length >= 6) {
    keyLen = parseInt(argv[5], 10);
}

const salt = crypto.randomBytes(16);
const passBuf = Buffer.from(password);
crypto.pbkdf2(passBuf, salt, iterations, keyLen, algo, (err, derivedKey) => {
    if (err) {
        console.error('Key derivation failed:', err);

        return;
    }

    const pass = [
        derivedKey.toString('hex'),
        salt.toString('hex'),
        iterations,
        algo,
        keyLen
    ].join(':');
    console.log(pass);
});

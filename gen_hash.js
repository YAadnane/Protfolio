
import bcrypt from 'bcrypt';

const password = 'admin';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, function(err, hash) {
    console.log(`NEW_HASH: ${hash}`);
});

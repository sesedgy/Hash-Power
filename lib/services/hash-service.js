const config     = require('../../config/config');
const md5 = require('md5');

class HashService{
    constructor(){}

    getHash(string){
        let newString = string + config.get('localSalt') ;
        return md5(newString);
    }

    compareWithHash(string, hash){
        let newString = string + config.get('localSalt') ;
        return md5(newString) === hash;
    }

    createGuidString() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + s4() + s4() +
            s4() + s4() + s4() + s4();
    }
}

let hashService = new HashService();

module.exports.HashService = hashService;
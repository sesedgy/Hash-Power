const config     = require('../../config/config');
const axios      = require('axios');

class WalletService{
    constructor(){
        this.walletInfo = {
            mainPassword: config.get('wallet:password')
        }
    }
    createAdress(label){
        return axios.get('http://localhost:3000/merchant/$guid/new_address?password=' + this.walletInfo.mainPassword + '&label=' + label);
    }

}

let walletService = new WalletService();

module.exports.walletService = walletService;
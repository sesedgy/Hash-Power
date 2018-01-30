const config               = require('../../config/config');
const axios                = require('axios');
const UserModel            = require('../../config/db').UserModel;
const moduleName           = "WalletService";

class WalletService{
    constructor(){
        this.walletInfo = {
            guid: config.get('wallet:guid'),
            mainPassword: config.get('wallet:password')
        };

        //Check payments once per timeToCheckAddressesInMs
        setInterval(() => {
            this.checkPayments();
        }, config.get('wallet:timeToCheckAddressesInMs'));
    }
    createAdress(label){
        return axios.get('http://localhost:3000/merchant/' + this.walletInfo.guid + '/new_address?password=' + this.walletInfo.mainPassword + '&label=' + label);
    }
    getAddressesList(){
        return axios.get('http://localhost:3000/merchant/' + this.walletInfo.guid + '/list?password=' + this.walletInfo.mainPassword);
    }
    archivingAnAddress(address){
        return axios.get('http://localhost:3000/merchant/' + this.walletInfo.guid + '/archive_address?password=' + this.walletInfo.mainPassword + '&address=' + address);
    }
    makingOutgoingPayment(toAddress, amount){
        return axios.get('http://localhost:3000/merchant/' + this.walletInfo.guid + '/payment?password=' + this.walletInfo.mainPassword + '&to=' + toAddress + '&amount=' + amount);
    }

    //Проверяем все незаархивированные адреса и если есть поступление денег, то зачисляем их пользователю и архивируем адрес
    //TODO сейчас неиспользуемые адреса не удаляются т.е. в теории их может накопиться 100500
    checkPayments(){
        this.getAddressesList().then(response => {
            response.data.addresses.forEach((address) => {
                if(address.balance !== 0){
                    let userId = address.label.slice(0, address.label.indexOf('_'));
                    UserModel.findByIdAndUpdate(userId, {$set: {'balance': user.balance + address.balance}}, (err) => {
                        if (err){
                            log.warn(moduleName + '; CheckPayments - findOne: ' + err.message);
                        }else{
                            this.archivingAnAddress(address.address);
                            log.info(moduleName + '; User: ' + userId + ' have a new balance: ' + user.balance + address.balance);
                        }
                    });
                }
            });
        })
    }

}

let walletService = new WalletService();

module.exports.WalletService = walletService;
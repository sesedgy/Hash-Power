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

    checkPayments(){
        this.getAddressesList().then(response => {
            response.addresses.forEach((address) => {
                if(address.balance !== 0){
                    let hashPrivateKey = address.label.slice(0, address.label.indexOf('_'));
                    UserModel.findOne({ 'privateKey': hashPrivateKey }, function (err, user) {
                        if (!err){
                            if(user) { //TODO может ошибка
                                UserModel.update(
                                    {_id: user.id},  //TODO Проверить, возможно: "task._doc._id.toString()"
                                    {$set: {
                                        'balance': user.balance + address.balance
                                    }},
                                    function (err) {
                                        if (err){
                                            res.statusCode = 500;
                                            log.error('CRITICAL! ' + moduleName + '; CheckPayments - Dont update balance for ' + user.id + ' new balance is: ' + user.balance + address.balance);
                                            return res.send({ error: 'Server error' });
                                        }
                                    }
                                );
                            }
                        } else {
                            log.warn(moduleName + '; CheckPayments - findOne: ' + err.message);
                        }
                    });

                }
            });
        })
    }

}

let walletService = new WalletService();

module.exports.WalletService = walletService;
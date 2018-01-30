const log                  = require('../../config/log')(module);
const config               = require('../../config/config');
const UserModel            = require('../../config/db').UserModel;
const MailService          = require('../services/mail_service').MailService;
const WalletService        = require('../services/wallet_service').WalletService;
const HashService          = require('../services/hash_service').HashService;
const moduleName           = "UsersController";

module.exports = function(app) {

    //Get user
    app.get('/api/users/:key', (req, res) => {
        let hashPrivateKey = HashService.getHash(req.params.key);
        return UserModel.findOne({ 'privateKey': hashPrivateKey }, function (err, user) {
            if (!err) {
                user.privateKey = undefined;
                return res.send(user);
            } else {
                res.statusCode = 500;
                log.warn(moduleName + '; Get user - findOne: ' + err.message);
                return res.send({ error: 'Server error' });
            }
        });
    });

    //Create user
    app.post('/api/users', (req, res) => {
        let privateKey = HashService.createGuidString();
        let user = new UserModel({
            privateKey: HashService.getHash(privateKey)
        });

        user.save(function (err) {
            if (!err) {
                return res.send(privateKey);
            } else {
                console.log(err);
                res.statusCode = 500;
                res.send({error: 'Server error'});
                log.warn(moduleName + '; Create user - save user: ' + err.message);
            }
        });
    });

    //Deposit balance
    app.get('/api/users/:key/deposit', (req, res) => {
        return UserModel.findOne({ 'privateKey': HashService.getHash(req.params.key) }, function (err, user) {
            if (!err) {
                let addressLabel = HashService.getHash(req.params.key) + "_" + new Date().toLocaleDateString() + "_" + new Date().toLocaleTimeString();
                WalletService.createAdress(addressLabel)
                    .then(response => {
                        return res.send({address: response.data.address});
                    })
                    .catch(error => {
                        res.statusCode = 500;
                        res.send({ error: 'Server error' });
                        log.warn('UsersController: Address do not created - deposit');
                    });

            } else {
                res.statusCode = 500;
                log.warn(moduleName + '; Deposit balance - Do not find user deposit');
                return res.send({ error: 'Server error' });
            }
        });

    });

    //Withdrawal balance (amount in satoshi)
    app.get('/api/users/:key/withdrawal/:amount&:toAddress', (req, res) => {
        let hashPrivateKey = HashService.getHash(req.params.key);
        return UserModel.findOne({ 'privateKey': hashPrivateKey }, function (err, user) {
            if (!err) {
                if(user !== []){//TODO Проверить что возвращается когда ни один элемент не подходит условию
                    let amount = req.params.amount;
                    if(user.balance > amount + (amount * config.get('wallet:commission')) + (amount * config.get('withdrawalCommissionPercent'))){
                        UserModel.update(
                            {_id: user.id},  //TODO Проверить, возможно: "task._doc._id.toString()"
                            {$set: {
                                'balance': user.balance - amount - (amount * config.get('wallet:commission')) - (amount * config.get('withdrawalCommissionPercent'))
                            }},
                            function (err) {
                                if (!err){
                                    let amountWithoutComissions = amount - (amount * config.get('wallet:commission')) - (amount * config.get('withdrawalCommissionPercent'));
                                    WalletService.makingOutgoingPayment(req.params.toAddress, amountWithoutComissions).then(() => {
                                        return res.send({status: 'OK'});
                                    }).catch(error => {
                                        res.statusCode = 500;
                                        res.send({ error: 'Server error' });
                                        log.error('CRITICAL! ' + moduleName + '; Withdrawal balance - Money: ' + amountWithoutComissions
                                            + ' satoshi was not sent on address: ' + req.params.toAddress + ' because problems with wallet');
                                    });
                                }else {
                                    res.statusCode = 500;
                                    log.error(moduleName + '; Withdrawal balance - Do not save new user balance after withdrawal');
                                    return res.send({ error: 'Server error' });
                                }
                            }
                        );
                    }else{
                        res.statusCode = 500;
                        return res.send({ error: 'You have not enough money' });
                    }
                }
            } else {
                res.statusCode = 500;
                log.warn(moduleName + '; Withdrawal balance - Do not find user withdrawal');
                return res.send({ error: 'Server error' });
            }
        });
    });

    //Uncommented this section if use email in users
    /*
    // Create user
    app.post('/api/users', (req, res) => {
        UserModel.findOne({ 'email': req.body.email }, function (err, userWithDuplicateEmail) {
            if (!err) {
                if(userWithDuplicateEmail !== []) { //TODO Проверить что возвращается когда ни один элемент не подходит условию
                    let user = new UserModel({
                        privateKey: HashService.createGuidString(),
                        email: req.body.email
                    });

                    user.save(function (err) {

                        if (!err) {
                            let mailText = 'Dear Customer, \n' +
                                'your account created, save private key and use him for login: ' + user.privateKey;
                            MailService.sendMail(req.body.email, 'Dear Customer, your account was created', mailText).then(() => {
                                return res.send({status: 'OK'});
                            }).catch(error => {
                                res.statusCode = 500;
                                res.send({error: 'Server error'});
                            });
                        } else {
                            console.log(err);
                            res.statusCode = 500;
                            res.send({error: 'Server error'});
                            log.warn(moduleName + '; Create user - send email: ' + err.message);
                        }
                    });
                }
            } else {
                res.statusCode = 500;
                log.warn(moduleName + '; Create user - findOne: ' + err.message);
                return res.send({ error: 'Server error' });
            }
        });
    });

    //Update user
    app.put('/api/users/:key', (req, res) => {
        let hashPrivateKey = HashService.getHash(req.params.key);
        return UserModel.findOne({ 'privateKey': hashPrivateKey }, function (err, user) {
            if (!err) {
                UserModel.update(
                    {_id: user.id},  //TODO Проверить, возможно: "task._doc._id.toString()"
                    {$set: {
                        'email': req.body.email
                    }},
                    function (err) {
                        if (!err){
                            let mailText = 'Dear Customer, \n' +
                                'your email was successful changed on: ' + req.body.email;
                            MailService.sendMail(req.body.email, 'Dear Customer, your email was changed', mailText).then(() => {
                                return res.send({status: 'OK'});
                            }).catch(error => {
                                res.statusCode = 500;
                                res.send({error: 'Server error'});
                                //TODO Проверить что в случае ошибки отправки почты происходит
                            });
                        }else {
                            res.statusCode = 500;
                            log.error(moduleName + '; Update user - Email for: ' + user.email + ' was not change on: ' + req.body.email);
                            return res.send({ error: 'Server error' });
                        }
                    });
            } else {
                res.statusCode = 500;
                log.warn(moduleName + '; Update user - find one ' + err.message);
                return res.send({ error: 'Server error' });
            }
        });
    });
    */
};
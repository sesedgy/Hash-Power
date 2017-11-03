const log                  = require('../../config/log')(module);
const TaskModel            = require('../../config/db').TaskModel;
const mailService          = require('../services/mail_service').mailService;
const walletService        = require('../services/wallet_service').walletService;


module.exports = function(app) {

    //Get list for all tasks
    app.get('/api/tasks', (req, res) => {
        return TaskModel.find(function (err, taskes) {
            if (!err) {
                return res.send(taskes);
            } else {
                res.statusCode = 500;
                log.error('Internal error(%d): %s',res.statusCode,err.message);
                return res.send({ error: 'Server error' });
            }
        });
    });

    //Create task
    app.post('/api/tasks', (req, res) => {
        let task = new TaskModel({
            name: req.body.name, //TODO Возможно будет не нужно
            email: req.body.email,
            reward: req.body.reward, //TODO Возможно будет не нужно
            dateOfEnd: req.body.dateOfEnd,
            status: "NotPaid"
        });

        let taskId = task._doc._id.toString();
        task.save(function (err) {
            if (!err) {
                walletService.createAdress(taskId)
                    .then(response => {
                        console.log(response.data.explanation.address);//TODO Delete this
                        let mailText = 'Dear Customer, \n' +
                            'Your order created and wait for payment on this bitcoin address: ' + response.data.explanation.address; //TODO Проверить возвращает ли корректный адрес
                        mailService.sendMail(req.body.email, 'Order created and wait for payment', 'Dear Customer, \n your order created and wait', mailText)
                            .then(() => {
                                return res.send({status: 'OK'});
                            })
                            .catch(error => {
                                res.statusCode = 500;
                                res.send({ error: 'Server error' });
                                log.error('Error - create task-save-createAddress-sendMail (%d): %s',res.statusCode,err.message);
                            });
                    })
                    .catch(error => {
                        res.statusCode = 500;
                        res.send({ error: 'Server error' });
                        log.error('Error - create task-save-createAddress (%d): %s',res.statusCode,err.message);
                    });
            } else {
                console.log(err);
                res.statusCode = 500;
                res.send({ error: 'Server error' });
                log.error('Error - create task-save (%d): %s',res.statusCode,err.message);
            }
        });
    });

    //TODO Метод для чеканья кошельков и переводе заказа в другой статус после успешного чека

};
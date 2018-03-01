const formidable           = require('formidable');
const fs                   = require('fs');
const path                 = require('path');
const multer               = require('multer');
const log                  = require('../../config/log')(module);
const config               = require('../../config/config');
const TaskModel            = require('../../config/db').TaskModel;
const UserModel            = require('../../config/db').UserModel;
const MailService          = require('../services/mail_service').MailService;
const WalletService        = require('../services/wallet_service').WalletService;
const HashService          = require('../services/hash_service').HashService;
const moduleName           = "TasksController";
const taskUploadPath       = config.get('taskUploadPath');
const resultUploadPath     = config.get('resultUploadPath');

module.exports = function(app) {

    //Task upload settings
    let storage = multer.diskStorage({
        destination: function (req, file, callback) {
            callback(null, taskUploadPath);
        },
        filename: function (req, file, callback) {
            callback(null, file.fieldname + '-' + Date.now() + file.originalname.slice(file.originalname.lastIndexOf('.')));
        }
    });
    let upload  = multer({ storage: storage });

    //Get list for all tasks
    //-
    app.get('/api/tasks', (req, res) => {
        return TaskModel.find(function (err, tasks) {
            if (!err) {
                tasks.forEach(function (item) {
                    item.taskFileName = undefined;
                    item.resolvedTaskFileName = undefined;
                    // item.email = undefined;
                    item.privateKey = undefined;
                });
                return res.send(tasks);
            } else {
                res.statusCode = 500;
                log.warn(moduleName + '; Get tasks - find: ' + err.message);
                return res.send({ error: 'Server error' });
            }
        });
    });

    //Get free task
    //-
    app.get('/api/freeTask', (req, res) => {
        return TaskModel.findOne({ 'status': 'Open' }, null, {sort: 'dateOfStart'}, function (err, tasks) {
            if(!tasks) {
                res.statusCode = 404;
                return res.send({ error: 'Not found' });
            }
            if (!err) {
                let maxReward = tasks[0].reward;
                let indexOfTaskWithMaxReward = 0;
                tasks.forEach(function (item, index) {
                    if (item.reward > maxReward){
                        indexOfTaskWithMaxReward = index;
                    }
                });
                let resultOfFunction = increaseCountOfWorkers(tasks[indexOfTaskWithMaxReward]);
                if(resultOfFunction === null){
                    tasks[indexOfTaskWithMaxReward].resolvedTaskFileName = undefined;
                    tasks[indexOfTaskWithMaxReward].email = undefined;
                    tasks[indexOfTaskWithMaxReward].privateKey = undefined;
                    return res.send(tasks[indexOfTaskWithMaxReward]);
                }else{
                    res.statusCode = 500;
                    log.warn(moduleName + '; Increase count of workers - ' + err.message);
                    return res.send({ error: 'Server error' });
                }
            } else {
                res.statusCode = 500;
                log.warn(moduleName + '; Get free task - find: ' + err.message);
                return res.send({ error: 'Server error' });
            }
        });
    });

    //Get most expensive task
    //-
    app.get('/api/mostExpensiveTask', (req, res) => {
        return TaskModel.find(function (err, tasks) {
            if(!tasks) {
                res.statusCode = 404;
                return res.send({ error: 'Not found' });
            }
            if (!err) {

                let maxPrice = tasks[0].reward;
                let mostExpensiveTaskIndex = 0;
                tasks.forEach(function (item, index) {
                    if(item.reward > maxPrice){
                        maxPrice = item.reward;
                        mostExpensiveTaskIndex = index
                    }
                });
                let resultOfFunction = increaseCountOfWorkers(tasks[mostExpensiveTaskIndex]);
                if(resultOfFunction === null){
                    tasks[mostExpensiveTaskIndex].resolvedTaskFileName = undefined;
                    tasks[mostExpensiveTaskIndex].email = undefined;
                    tasks[mostExpensiveTaskIndex].privateKey = undefined;
                    return res.send(tasks[mostExpensiveTaskIndex]);
                }else{
                    res.statusCode = 500;
                    log.warn(moduleName + '; Increase count of workers - ' + err.message);
                    return res.send({ error: 'Server error' });
                }
            } else {
                res.statusCode = 500;
                log.warn(moduleName + '; Get most expensive task - find: ' + err.message);
                return res.send({ error: 'Server error' });
            }
        });
    });

    //Get task by id
    //taskId
    app.get('/api/tasks/:id', (req, res) => {
        return TaskModel.findById(req.params.id, function (err, task) {
            if(!task) {
                res.statusCode = 404;
                return res.send({ error: 'Not found' });
            }
            if (!err) {
                let resultOfFunction = increaseCountOfWorkers(task);
                if(resultOfFunction === null){
                    task.resolvedTaskFileName = undefined;
                    task.email = undefined;
                    task.privateKey = undefined;
                    return res.send(task);
                }else{
                    res.statusCode = 500;
                    log.warn(moduleName + '; Increase count of workers - ' + err.message);
                    return res.send({ error: 'Server error' });
                }
            } else {
                res.statusCode = 500;
                log.warn(moduleName + '; Get task(id) - find: ' + err.message);
                return res.send({ error: 'Server error' });
            }
        });
    });

    //Get task result by id and key
    //taskId, taskPrivateKey
    app.get('/api/tasks/:id/result/:key', (req, res) => {
        let hashPrivateKey = HashService.getHash(req.params.key);
        return TaskModel.findById(req.params.id, function (err, task) {
            if(!task || hashPrivateKey !== task.privateKey) {
                res.statusCode = 404;
                return res.send({ error: 'Not found' });
            }
            if (!err) {
                res.setHeader('Content-disposition', 'attachment; filename="' + task.resolvedTaskFileName + '"');
                res.send(new Buffer(fs.readFileSync(global.__basedir + resultUploadPath + '/' + task.resolvedTaskFileName)).toString("base64"));
            }
        });
    });

    //Cancel work with task
    //taskId
    app.get('/api/tasks/:id/cancelWork', (req, res) => {
        return TaskModel.findById(req.params.id, function (err, task) {
            if(!task) {
                res.statusCode = 404;
                return res.send({ error: 'Not found' });
            }
            if (!err) {
                if(task.countOfWorkers < 1){
                    log.warn(moduleName + '; Count of workers is minimal - for task: ' + task._id);
                    return res.send({status: 'OK'});
                }
                let newStatus = (task.countOfWorkers === 1) ? "Open" : "In progress";
                TaskModel.update(
                    {_id: task._id},
                    {$set: {
                        'countOfWorkers': task.countOfWorkers - 1,
                        'status': newStatus
                    }},
                    function (err) {
                        if (!err){
                            return res.send({status: 'OK'});
                        }else{
                            res.statusCode = 500;
                            log.warn(moduleName + '; Cancel work with task(id) - update task: ' + err.message);
                            return res.send({ error: 'Server error' });
                        }
                    }
                );
            } else {
                res.statusCode = 500;
                log.warn(moduleName + '; Cancel work with task(id) - find task: ' + err.message);
                return res.send({ error: 'Server error' });
            }
        });
    });

    //Create task (reward in satoshi)
    //reward, dateOfEnd, privateKey, file
    app.post('/api/tasks', upload.single('fileWithTask'), (req, res) => {
        let hashPrivateKey = HashService.getHash(req.body.privateKey);
        return UserModel.findOne({ 'privateKey': hashPrivateKey }, function (err, user) {
            if (!err) {
                if(user !== []){//TODO Проверить что возвращается когда ни один элемент не подходит условию
                    let amount = req.body.reward * 100000000;
                    if(user.balance > amount + (amount * config.get('taskCommissionCoefficient'))){
                        UserModel.update(
                            {_id: user._id},
                            {
                                balance: user.balance - amount - (amount * config.get('taskCommissionCoefficient'))
                            },
                            function (err) {
                                if (!err){
                                    let taskPrivateKey = HashService.createGuidString();
                                    let taskFileName = req.file.filename;
                                    let time = (req.body.timeOfEnd !== "") ? req.body.timeOfEnd : "00:00";
                                    let task = new TaskModel({
                                        privateKey: HashService.getHash(taskPrivateKey),
                                        taskFileName: taskFileName,
                                        reward: req.body.reward * 100000000,
                                        dateOfEnd: (req.body.dateOfEnd !== "") ? new Date(time + " " + req.body.dateOfEnd) : null,
                                        status: "Open"
                                    });
                                    task.save(function (err) {
                                        if (!err) {
                                            res.send(taskPrivateKey);
                                        } else {
                                            res.statusCode = 500;
                                            res.send({ error: 'Server error' });
                                            log.warn(moduleName + '; Create task - save task');
                                        }
                                    });
                                }else {
                                    res.statusCode = 500;
                                    log.error('CRITICAL ' + moduleName + '; Withdrawal balance - Do not save new user balance after createTask');
                                    return res.send({ error: 'Server error' });
                                }
                            }
                        );
                    }else{
                        res.statusCode = 402;
                        return res.send({ error: 'You haven\'t enough money' });
                    }
                }else{
                    res.statusCode = 401;
                    return res.send({error: 'Private key is wrong'})
                }
            } else {
                res.statusCode = 500;
                log.warn(moduleName + '; Create task - find user');
                return res.send({ error: 'Server error' });
            }
        });
    });

    //Когда кто-то получает таск методом GET, то счетчик работников таска увеличивается
    function increaseCountOfWorkers(task){
        TaskModel.update(
            {_id: task._id},
            {$set: {
                'countOfWorkers': task.countOfWorkers + 1
            }},
            function (err) {
                if (err){
                    return err;
                }else{
                    return null;
                }
            }
        );
    }
};
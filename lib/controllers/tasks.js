const formidable           = require('formidable');
const fs                   = require('fs');
const path                 = require('path');
const log                  = require('../../config/log')(module);
const config               = require('../../config/config');
const TaskModel            = require('../../config/db').TaskModel;
const MailService          = require('../services/mail_service').MailService;
const WalletService        = require('../services/wallet_service').WalletService;
const moduleName           = "TasksController";

module.exports = function(app) {

    //Get list for all tasks
    app.get('/api/tasks', (req, res) => {
        return TaskModel.find(function (err, tasks) {
            if (!err) {
                tasks.forEach(function (item) {
                    item.taskPath = undefined;
                    item.resolvedTaskPath = undefined;
                    item.email = undefined;
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
                    tasks[indexOfTaskWithMaxReward].resolvedTaskPath = undefined;
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
                    tasks[mostExpensiveTaskIndex].resolvedTaskPath = undefined;
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

    //Get task(id)
    app.get('/api/tasks/:id', (req, res) => {
        return TaskModel.findById(req.params.id, function (err, task) {
            if(!task) {
                res.statusCode = 404;
                return res.send({ error: 'Not found' });
            }
            if (!err) {
                let resultOfFunction = increaseCountOfWorkers(task);
                if(resultOfFunction === null){
                    task.resolvedTaskPath = undefined;
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

    //Get task result
    app.get('/api/tasks/:id/result/:key', (req, res) => {
        let hashPrivateKey = HashService.getHash(req.params.key);
        return TaskModel.findById(req.params.id, function (err, task) {
            if(!task || hashPrivateKey !== task.privateKey) {
                res.statusCode = 404;
                return res.send({ error: 'Not found' });
            }
            if (!err) {
                //TODO Отправка файла с решением при получении решения
                return res.send(task);
            } else {
                res.statusCode = 500;
                log.warn(moduleName + '; Get task(id) - find: ' + err.message);
                return res.send({ error: 'Server error' });
            }
        });
    });

    //Cancel work with task(id)
    app.get('/api/tasks/cancelWork:id', (req, res) => {
        return TaskModel.findById(req.params.id, function (err, task) {
            if(!task) {
                res.statusCode = 404;
                return res.send({ error: 'Not found' });
            }
            if (!err) {
                if(task.countOfWorkers < 1){
                    log.warn(moduleName + '; Count of workers is minimal - for task: ' + task.id); //TODO Проверить, возможно: "task._doc._id.toString()"
                    return res.send({status: 'OK'});
                }
                let newStatus = (task.countOfWorkers === 1) ? "Open" : "In progress";
                TaskModel.update(
                    {_id: task.id},  //TODO Проверить, возможно: "task._doc._id.toString()"
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

    //Create task (reward in satoshi) {reward, dateOfEnd, privateKey, file}
    app.post('/api/tasks', (req, res) => {
        let hashPrivateKey = HashService.getHash(req.body.privateKey);
        return UserModel.findOne({ 'privateKey': hashPrivateKey }, function (err, user) {
            if (!err) {
                if(user !== []){//TODO Проверить что возвращается когда ни один элемент не подходит условию
                    let amount = task.reward;
                    if(user.balance > amount + (amount * config.get('taskCommissionPercent'))){
                        UserModel.update(
                            {_id: user.id},  //TODO Проверить, возможно: "task._doc._id.toString()"
                            {$set: {
                                'balance': user.balance - amount - (amount * config.get('taskCommissionPercent'))
                            }},
                            function (err) {
                                if (!err){
                                    let taskPrivateKey = HashService.createGuidString();
                                    let taskPath = null;
                                    let form = new formidable.IncomingForm();
                                    form.parse(req, function (err, fields, files) {
                                        let oldpath = files.filetoupload.path;
                                        taskPath = __basedir + taskPrivateKey + "." + files.filetoupload.name.slice(files.filetoupload.name.lastIndexOf('.') * -1);//TODO Затестить верно ли возвращает разрешение
                                        fs.rename(oldpath, taskPath, function (err) {
                                            if (!err){
                                                let task = new TaskModel({
                                                    taskPrivateKey: HashService.getHash(taskPrivateKey),
                                                    taskPath: taskPath,
                                                    reward: req.body.reward,
                                                    dateOfEnd: req.body.dateOfEnd,
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

                                            }else{
                                                res.statusCode = 500;
                                                res.send({ error: 'Server error' });
                                                log.warn(moduleName + '; Create task - save file with task');
                                            }
                                        });
                                    });
                                }else {
                                    res.statusCode = 500;
                                    log.error('CRITICAL ' + moduleName + '; Withdrawal balance - Do not save new user balance after createTask');
                                    return res.send({ error: 'Server error' });
                                }
                            }
                        );
                    }else{
                        res.statusCode = 400;
                        return res.send({ error: 'You haven\'t enough money' });
                    }
                }else{
                    res.statusCode = 400;
                    return res.send({error: 'Private key is wrong'})
                }
            } else {
                res.statusCode = 500;
                log.warn(moduleName + '; Create task - find user');
                return res.send({ error: 'Server error' });
            }
        });
    });

    function increaseCountOfWorkers(task){
        TaskModel.update(
            {_id: task.id},  //TODO Проверить, возможно: "task._doc._id.toString()"
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
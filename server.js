const express        = require('express');
const MongoClient    = require('mongodb').MongoClient;
const bodyParser     = require('body-parser');
const mongoose       = require('mongoose');
const config         = require('./config/config');
const db             = require('./config/db');
const log            = require('./config/log')(module); //Передаем  модуль в метод
const app            = express();

//global variables
global.__basedir = __dirname;

// app.use(express.methodOverride()); // Support PUT and DELETE //TODO все падает
app.use(bodyParser.urlencoded({ extended: true })); //Include JSON parser
app.use(bodyParser.json());
// app.use(app.router); // модуль для простого задания обработчиков путей //TODO А надо ли, все падает

// mongoose.connect(db.url);
//

require('./lib/controllers/tasks')(app);

app.listen(config.get('port'), () => {
    log.info('Express server listening on port ' + config.get('port'));
});


//Error handlers
app.use(function(req, res){
    res.status(404);
    log.debug('Not found URL: %s',req.url);
    res.send({ error: 'Not found' });
});
app.use(function(err, req, res){
    res.status(err.status || 500);
    log.error('Internal error(%d): %s',res.statusCode,err.message);
    res.send({ error: err.message });
});
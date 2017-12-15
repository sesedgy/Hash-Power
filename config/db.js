let mongoose    = require('mongoose');
let log         = require('./log')(module);
let config      = require('./config');

mongoose.Promise = global.Promise;
let options = {
    useMongoClient: true,
    reconnectTries: Number.MAX_VALUE, // Never stop trying to reconnect
    reconnectInterval: 500, // Reconnect every 500ms
    poolSize: 10, // Maintain up to 10 socket connections
    // If not connected, return errors immediately rather than waiting for reconnect
    bufferMaxEntries: 0
};
mongoose.connect(config.get('db:url'), options);
let db = mongoose.connection;

db.on('error', function (err) {
    log.error('connection error:', err.message);
});
db.once('open', function callback () {
    log.info("Connected to DB!");
});

let Schema = mongoose.Schema;

// Schemas
let Task = new Schema({
    id: Schema.Types.ObjectId,
    privateKey: String,
    reward: {type: Number, default: 0},
    dateOfStart: {type: Date, default: new Date()},
    dateOfEnd: {type: Date, default: new Date().setDate(new Date().getDate() + 30)},
    status: String,
    countOfWorkers: {type: Number, default: 0},
    taskPath: String,
    resolvedTaskPath: String
});
let User = new Schema({
    id: Schema.Types.ObjectId,
    privateKey: String,
    balance: {type: Number, default: 0}
});

let TaskModel = mongoose.model('Task', Task);
let UserModel = mongoose.model('User', User);

module.exports.TaskModel = TaskModel;
module.exports.UserModel = UserModel;
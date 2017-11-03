let mongoose    = require('mongoose');
let log         = require('./log')(module);
let config      = require('./config');

mongoose.Promise = global.Promise;
mongoose.connect(config.get('db:url'), { useMongoClient: true });
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
    name: String,
    email: String,
    reward: Number,
    dateOfStart: {type: Date, default: new Date()},
    dateOfEnd: {type: Date, default: new Date().setDate(new Date().getDate() + 30)},
    status: String
});

let TaskModel = mongoose.model('Task', Task);

module.exports.TaskModel = TaskModel;
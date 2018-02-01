const apiUrl = "http://localhost:8000/api/";
const gridRefreshTimeInMs = 10000;

//signUp modal window
function signUp(){
    showLoader();
    $.post(apiUrl + "users", {})
        .done(function(data) {
            $("#signUpKeyText").text("Your private key is: " + data);
            $("#signUpInstructionText").text("Use your private key for work with wallet and create task");
            $("#signUpButton").hide();
        })
        .fail(function() {
            new PNotify({
                title: 'Server error',
                text: 'Cannot create new user',
                type: 'error'
            });
        })
        .always(function() {
            hideLoader();
        });
}

//LogIn modal window
//TODO Сбрасывать ключ при закрытии окна?
let privateKey;
function logIn(){
    showLoader();
    privateKey = $("#privateKey_LogIn").val();
    $.get(apiUrl + "users/" + privateKey)
        .done(function(data) {
            //TODO если ключ левый
            if(data !== null) {
                $("#userWallet").show();
                $("#logInForm").hide();
                $("#walletBalance").text("Balance: " + data.balance);
            }
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
            if(jqXHR.status === 401){
                new PNotify({
                    title: "Wrong private key",
                    text: 'Try again',
                    type: 'error'
                });
            }else{
                new PNotify({
                    title: errorThrown,
                    text: 'Cannot logIn',
                    type: 'error'
                });
            }
        })
        .always(function() {
            hideLoader();
        });
}
function depositFormShow(){
    $("#depositForm").show();
    $("#withdrawalForm").hide();
    $("#addressWithdrawal").val("");
}
function withdrawalFormShow(){
    $("#withdrawalForm").show();
    $("#depositForm").hide();
    $("#depositAddressText").text("");
}
function generateDepositAddress(){
    showLoader();
    $.get(apiUrl + "users/" + privateKey + "/deposit")
        .done(function(data) {
            $("#depositAddressText").text("Generated address: " + data.address);
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
            new PNotify({
                title: errorThrown,
                text: 'Cannot generate deposit address',
                type: 'error'
            });
        })
        .always(function() {
            hideLoader();
        });
}
function withdrawalBalance(){
    showLoader();
    let amountWithdrawal = $("#amountWithdrawal").val();
    let addressWithdrawal = $("#addressWithdrawal").val();
    $.get(apiUrl + "users/" + privateKey + "/withdrawal/" + amountWithdrawal + "&" + addressWithdrawal)
        .done(function() {
            $("#successWithdrawalText").text("Bitcoins were sent on address: " + addressWithdrawal);
            setTimeout(function() { $("#successWithdrawalText").text("") }, 6000);
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
            if(jqXHR.status === 402){
                new PNotify({
                    title: "You have not enough money",
                    text: 'Try again',
                    type: 'error'
                });
            }else{
                new PNotify({
                    title: errorThrown,
                    text: 'Cannot sent bitcoins',
                    type: 'error'
                });
            }
        })
        .always(function() {
            hideLoader();
        });
}
$('#userWallet').on('hidden.bs.modal', function (e) {
    //Сбрасываем ключ при закрытии окна
    privateKey = "";
});

//Task modal window
function createTask(){
    let formData = new FormData;
    formData.append('img', $("#fileWithTask_CreateTask")[0].files[0]);
    let task = {
        privateKey: $("#privateKey_CreateTask").val(),
        reward: $("#reward_CreateTask").val(),
        dateOfEnd: $("#dateOfEnd_CreateTask").val() + $("#timeOfEnd_CreateTask").val(),
        fileWithTask: formData
    };
    console.log(task.fileWithTask);
    showLoader();
    $.ajax({
        url: apiUrl + "tasks",
        data: JSON.stringify(task),
        processData: false,
        contentType: 'application/json',
        type: 'POST',
        success: function (data) {
            $("#userWallet").show();
            $("#logInForm").hide();
            $("#createTaskResultText").text("Your private key for access to task result or cancel of task: " + data);
            hideLoader();
        },
        error: function (jqXHR, textStatus, errorThrown){
            if(jqXHR.status === 401){
                new PNotify({
                    title: "Wrong private key",
                    text: 'Try again',
                    type: 'error'
                });
            }else if(jqXHR.status === 402){
                new PNotify({
                    title: "You have not enough money",
                    text: 'Try again',
                    type: 'error'
                });
            }else {
                new PNotify({
                    title: errorThrown,
                    text: 'Cannot create task',
                    type: 'error'
                });
            }
            hideLoader();
        }
    });
    // $.post(apiUrl + "tasks", task)
    //     .done(function(data) {
    //         //TODO если ключ левый
    //         if(data) {
    //             $("#userWallet").show();
    //             $("#logInForm").hide();
    //             $("#createTaskResultText").text("Your private key for access to task result or cancel of task: " + data);
    //         }
    //     })
    //     .fail(function(jqXHR, textStatus, errorThrown) {
    //         if(jqXHR.status === 401){
    //             new PNotify({
    //                 title: "Wrong private key",
    //                 text: 'Try again',
    //                 type: 'error'
    //             });
    //         }else if(jqXHR.status === 402){
    //             new PNotify({
    //                 title: "You have not enough money",
    //                 text: 'Try again',
    //                 type: 'error'
    //             });
    //         }else {
    //             new PNotify({
    //                 title: errorThrown,
    //                 text: 'Cannot create task',
    //                 type: 'error'
    //             });
    //         }
    //     })
    //     .always(function() {
    //         hideLoader();
    //     });
}
$("form#createTaskForm").submit(function(e) {
    e.preventDefault();
    var formData = new FormData(this);

    $.ajax({
        url: apiUrl + "tasks",
        type: 'POST',
        data: formData,
        success: function (data) {
            alert(data)
        },
        cache: false,
        contentType: false,
        processData: false
    });
});


function getTaskResult(){

}

function cancelTask(){

}

function loadTable() {
    let DateField = function(config) {
        jsGrid.Field.call(this, config);
    };
    DateField.prototype = new jsGrid.Field({
        itemTemplate: function(value) {
            let date = new Date(value);
            let dateString = date.toString('HH:mm | dd.MM.yyyy');
            return dateString;
        },
        sorter: function(date1, date2) {
            return new Date(date1) - new Date(date2);
        }
    });
    jsGrid.fields.dateField = DateField;

    let RewardField = function(config) {
        jsGrid.Field.call(this, config);
    };
    RewardField.prototype = new jsGrid.Field({
        itemTemplate: function(value) {
            return (value / 100000000).toFixed(8);
        },
        sorter: function(value1, value2) {
            return value1 - value2;
        }
    });
    jsGrid.fields.rewardField = RewardField;

    $("#jsGrid").jsGrid({
        width: "100%",
        height: document.documentElement.clientHeight - $("#toolbar").height() - 8 * 2 + "px",
        sorting: true,
        autoload: true,
        controller: {
            loadData: function(filter) {
                return $.ajax({
                    type: "GET",
                    url: apiUrl + "tasks",
                    data: filter
                });
            }
        },
        fields: [
            { name: "_id", title: "Id", type: "text", align: "center"},
            { name: "reward", title: "Reward", type: "rewardField", align: "center"},
            { name: "dateOfStart", title: "Creating date", type: "dateField", align: "center"},
            { name: "dateOfEnd", title: "Ending date", type: "dateField", align: "center"},
            { name: "countOfWorkers", title: 'Count of "workers"', type: "number", align: "center"},
            { name: "status", title: "Status", type: "text", align: "center"}
        ],
        rowClick: function(item, itemIndex, event){
            //TODO тут будет открытие модального окна с информацией по таску
        }
    });
}
function updateDataInTable(){
    $("#jsGrid").jsGrid("render").done(function() {});
}

function showLoader(){
    $('#loader').show('fast');
}
function hideLoader(){
    $('#loader').hide('fast');
}

loadTable();
let interval = setInterval(function(){
    updateDataInTable();
}, gridRefreshTimeInMs);


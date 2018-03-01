const apiUrl = "http://localhost:8000/api/";
const gridRefreshTimeInMs = 10000;
const walletCommission = 0;
const taskCommissionCoefficient = 0.1;
const withdrawalCommissionCoefficient = 0;

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

//Create task modal window
function createTaskSubmitFormFunction() {
    $('#createTaskForm').attr("action", apiUrl + "tasks");
    $('#createTaskForm').submit(function() {
        showLoader();
        $(this).ajaxSubmit({
            error: function(xhr, textStatus, errorThrown) {
                if(xhr.status === 401){
                    new PNotify({
                        title: "Wrong private key",
                        text: 'Try again',
                        type: 'error'
                    });
                }else if(xhr.status === 402){
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
            },

            success: function(response) {
                hideLoader();
                $('#createTaskForm').hide();
                $('#createTaskResult').show();
                $('#createTaskResultText').empty().text("Task private key (save it): " + response);
            }
        });
        //Very important line, it disable the page refresh.
        return false;
    });
}
function calculatePrice(){
    let reward = $('#reward_CreateTask').val() * 1;
    let calculatedPrice = reward + (reward * taskCommissionCoefficient);
    $('#totalPriceCreateTask').text('Task commission percent: ' + (taskCommissionCoefficient * 100) + '%. Total: ' + calculatedPrice)
}
$('#createTaskModal').on('hidden.bs.modal', function (e) {
    //Сбрасываем ключ при закрытии окна
    document.getElementById("createTaskForm").reset();
    calculatePrice();
    $('#createTaskResult').hide();
    $('#createTaskForm').show();
});

//Search task modal window
function openGetTaskResultModal(taskId){
    $('#getTaskResultModal').modal('show');
    if (taskId !== undefined){
        $("#id_SearchTask").val(taskId);
    }else{
        $("#id_SearchTask").val("");
    }
}
function getTaskResult(){
    showLoader();
    let id = $("#id_SearchTask").val();
    let privateKey = $("#privateKey_SearchTask").val();
    $.get(apiUrl + "tasks/" + id + "/result/" + privateKey)
        .done(function(data) {
            if(data !== null) {
                let dataUri = "data:application/octet-stream;base64," + data;
                let filename = "Task answer " + id + ".txt";
                $("<a download='" + filename + "' href='" + dataUri + "'></a>")[0].click();
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
            openGetTaskResultModal(item.item._id)
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

function loadPage() {
    loadTable();
    createTaskSubmitFormFunction();
    let interval = setInterval(function () {
        updateDataInTable();
    }, gridRefreshTimeInMs);
}

loadPage();


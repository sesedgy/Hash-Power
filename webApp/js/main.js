const apiUrl = "http://localhost:8000/api/";

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

function createTask(){

}

function getTaskResult(){

}

function cancelTask(){

}

function updateDataInTable(){

}

function showLoader(){
    $('#loader').show('fast');
}

function hideLoader(){
    $('#loader').hide('fast');
}

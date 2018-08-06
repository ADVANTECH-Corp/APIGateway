
var groupName = 'WSNManage';
var uriPrefix = '../../restapi/'+groupName+'/';
var webPrefix = 'ws://' + location.host +'/';

// Entry point of this web app
function start( param ) {
    console.log( groupName + ' start');     

    // 1. init UI layout
    init_view();
    // 2. get init data and binding UI commonpent
    init_data_binding();
    // 3. reg websocket event
    reg_websocket();
}

// Initial UI Layout and view style by W/H
function init_view()
{
    console.log( groupName + ' init_view');    
    document.getElementById('wsn_table').style.top = '60px'; 
    document.getElementById('wsn_table').style.left = '20px';   
    document.getElementById('wsn_table').style.width = "98%";    
}

// Get Data by RESTful API & register websocket by group
function init_data_binding()
{
    
    console.log( groupName + ' init_data_binding');   

    var xhttp = new XMLHttpRequest();

    // Synchronous 

    xhttp.open("GET", uriPrefix+'SenHub/AllSenHubList', false); 
    xhttp.send(null);
    if (xhttp.status === 200) {
        console.log(xhttp.responseText);
    }   

    // Asynchronous
    xhttp.open("GET", uriPrefix+'Connectivity', true); 

    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
          console.log('ready to get' + this.responseText);
        }
    };
    
    xhttp.onerror = function (e) {
        console.error(xhttp.statusText);
    };

    xhttp.send();
     
}

// To handler websocket event to UI display 
function data_event_handle( evt )
{
    console.log( groupName + ' data_event_handle'); 
}

function reg_websocket()
{
    console.log( groupName + ' reg_websocket'); 
    var wsUri = webPrefix+groupName;
    websocket = new WebSocket(wsUri);
 
    websocket.onmessage = function(evt) {
        data_event_handle(evt)
    };

    /*
    websocket.onopen = function(evt) { 
        //onOpen(evt)
    };
    websocket.onclose = function(evt) {
         //onClose(evt)
    };
    websocket.onerror = function(evt) {
        //onError(evt)
        console.log('error'+evt);
    };*/       

       
}

// To handler UI event 
function ui_event_handle( )
{
    console.log( groupName + ' ui_event_handle');  
}





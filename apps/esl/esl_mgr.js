// App Plug-in Module Sample
var STATUS = require('../../inc/statusCode.js').STATUS_CODE;

// Event Trigger
const EventEmitter = require('events');
var eventEmitterObj = new EventEmitter();



/* ====================================================================
    Note
    You need implement below 4 items integrate with EIS RESTful API Interfaces.
    1. <Definition> : Declared your App module
    2. <RESTful>    : get / put / post / delete
    3. <Event>      : for evnet trigger Functions
    4. <Export>     : Export your function map to general interface
    ==================================================================== 
*/


// <1> ============== <Definition> ==============

// Entry path of your app => uri: restapi/<xxx>/ => If URI is matching your group name will pass to this Module
const groupName = 'WSNManage';

// path: router path : => rui: restapi/<xxx>/* => path match restapi/<xxx>/ will pass to this module
// action: Support which HTTP Action ( GET, PUT, POST, DELETE )
// ex: [{"path":"senhub/data","action":"GET,PUT"}];  => Match URI Route: restapi/<xxx>/senhub/data   Action: 'GET'
var routers = [{"path":"*","action":"GET,PUT"}];



// Define Event Type for auto update by websocket  
var WSNEVENTS = [{"event":"eConnectivity_Capability"}, // 0
                 {"event":"eConnectivity_UpdateData"}, // 1
                 {"event":"eSenHub_Connected"},        // 2
                 {"event":"eSenHub_Disconnect"},       // 3     
                 {"event":"eSenHub_Capability"},       // 4
                 {"event":"eSenHub_UpdateData"},       // 5
                 {"event":"eAlarm_Message"}];          // 6

var EVENT_ID = 
{
    eConnectivity_Capability: 0,
    eConnectivity_UpdateData: 1,
    eSenHub_Connected: 2,
    eSenHub_Disconnect: 3,
    eSenHub_Capability: 4,
    eSenHub_UpdateData: 5,
    eAlarm_Message: 6,
};

var wsclients = [];


//    ============== <Definition> ==============

const TIMEOUT = 90000; // 90 seconds



// <5>  =============== < Code > =============

//   ******** import **************************
var Mqtt = require('mqtt');
var HashMap = require('hashmap').HashMap;


// *********** Define ************************

const FTP_FOLDER_PATH = '/root/image/'

const URI_TYPE = { 
    CONNECTIVITY: 1,  // WSNManage/Connectivity
    SENSORHUB: 2,     // WSNManage/SenHub
    ESL: 3,           // WSNManage/ESL
    UNKNOW: -100,     // Unknow REST Endpoint
};


const GS_ESL_MODE = 
{
    LV_3: 3, // 3 layer GW / Router / Tag
    LV_2: 2, // 2 layer: GW-Router / Tag
};

ESL_GATEWAY_NAME = "ESL-GW"
ESL_ROUTER_NAME = "ESL-Router"
ESL_TAG_NAME = "ESL-Tag"

// EVT GS only supports 1~256 : 8 bits Int
const TRANSACTION_ID_LOW  = 1
const TRANSCATION_ID_HIGH = 256


// GSMART Protocol & Data Format
const GS_CMDTYPE = {
    REPORT: 1,   // Auto Report
    ACTION: 2,   // Get or Set
    RSP: 3,      // Response
};

// Response Code
const GS_CODE = {
    SUCCESS: 0,
    NOT_SUPPORT_CMD: 1,
    PARAM_ERROR: 2,
    CMD_ERROR: 3,
    CMD_TIMEOUT: 4,
    ROUTER_NOT_FOUND: 5,
    TAG_NOT_FOUND: 6,
    TAG_UPDATE_TIMEOUT: 7,
    TAG_LOW_POWER_ALERT: 8,
    TAG_PANEL_ERROR: 9,
    TAG_EX_FLASH_ERROR: 10,
    DEVICE_IS_BUSING: 11,
    DISCONNECT: 12
};

const GS_DEVTYPE_GENERAL    = 0;
const GS_DEVTYPE_GW         = 1;
const GS_DEVTYPE_ROUTER     = 2;
const GS_DEVTYPE_TAG        = 3;
const GS_DEVTYPE_ALL_ROUTER = 4;
const GS_DEVTYPE_ALL_TAG    = 5; 

const GS_MQTT_SUB = 'ESL/SendCmd'     // Report / SendCmd
const GS_MQTT_PUB = 'ESL/StateUpdate' // Reply


const GS_JSON_FORMAT =
{
    'Cmd-Type':-1,
    'Transaction-Id':-1,
    'Cmd-Id': -1,
    'Code': 0,
    'Parameter':{}
}


const DEV_STATUS =
{
    IDLE: 0,
    CMD_MODE: 1,
    UPDATING_IMAGE: 2,
    UPDATING_FW:3
}


const IOT_GW = {
    IoTGW: {

    }
};

const RF_INFO = {
    rf: '',  // RF Type "Zigbee"
    mac:'',  // RF MAC
    uid:'',  // unique id GW,Router: WiFi MAC, Tag: Zigbee address
    num: 0   // total number of device
};

const ESL_GW_INFO = 
{
    Info: {
            e:[ {n:'DeviceList', sv:'', asm:'r'},   
                {n:'device-number', v:0, asm:'r'},                 
                {n:'permit-tag-list',sv:'',asm:'rw'},
                {n:'add-permit-tag-list',sv:'',asm:'w'},
                {n:'remove-permit-tag-list',sv:'',asm:'w'},
                {n:'zd-securekey', sv:'', asm:'w'},
                {n:'tx-level', v:5, asm:'rw'},
                {n:'pan-id',v:1, asm:'r'},
                {n:'zd-fw-version', v:1, asm:'r'},
                {n:'status', v:DEV_STATUS.IDLE, asm:'r'},                
                {n:'reboot', bv:0, asm:'rw'}],

    bn: 'Info'    
    },
};

const ESL_ROUTER_INFO = 
{
    Info: {
            e:[ {n:'DeviceList', sv:'', asm:'r'},     
                {n:'device-number', v:0, asm:'r'},            
                {n:'tx-level-t',v:12,asm:'rw', min:0, max:22}, // EVT not support
                {n:'tx-level-r',v:12,asm:'rw', min:0, max:22},
                {n:'zd-fw-version', v:0, asm:'r'},
                {n:'status', v:DEV_STATUS.IDLE, asm:'r'}, 
                {n:'reboot', bv:0, asm:'rw'}],

    bn: 'Info'    
    },
};

const ESL_ROUTER_GW_INFO = 
{
    Info: {
            e:[ {n:'DeviceList', sv:'', asm:'r'},
                {n:'device-number', v:0, asm:'r'},    
                {n:'permit-tag-list',sv:'',asm:'rw'},      // Router-GW  
                {n:'tx-level-t',v:12,asm:'rw', min:0, max:22},
                {n:'tx-level-r',v:12,asm:'rw', min:0, max:22},
                {n:'zd-fw-version', v:0, asm:'r'},
                {n:'status', v:DEV_STATUS.IDLE, asm:'r'},                
                {n:'reboot', bv:0, asm:'rw'}],

    bn: 'Info'    
    },
};

const ESL_TAG_INFO = 
{
    SenData: {
            e:[{n:'image-crc', sv:'', asm:'r'},
               {n:'panel-type',sv:'', asm:'r'}],    // D33, D53

    bn: 'SenData'    
    },
    Info: {
        e:[ {n:"data-request-period",v:20000,asm:"rw",min:1000, max:60000, u:"msec"},     // ( sec ) The tag asks for the command's period
            {n:"state-report-period",v:60000, asm:"rw",min:15000, max:3600000, u:'msec'}, // ( sec ) The tag report period
            {n:"timeout",v:6,asm:"rw",min:4, max:8, u:'count'},                    // count  The tag rejoin count threshold to monitor how many times data-request without response
            {n:"battery",v:70,asm:"r",min:0, max:100, u:"%"},                      // battery ratio 0 ~ 100 %
            {n:'status', v:DEV_STATUS.IDLE, asm:'r'},                     
            {n:"fw-version",sv:'',asm:"r"}
          ],

    bn: 'Info'    
    },    
    Net: {
        e:[ {n:'tx-level',v:1,asm:'r'}, 
            {n:"rssi",v:3,asm:"r"},
            {n:'channel',v:6,asm:'r'}
          ],

    bn: 'Net'    
    },  
    Action: {
        e:[ {n:"image-update",sv:"",asm:"w", encode:"base64",type:"octe-stream"},
            {n:"refresh-image",bv:0,asm:"rw"},
            {n:"reboot",bv:0,asm:"rw"},
            {n:'reset-to-default', bv:0, asm:'rw'}],

    bn: 'Action'    
    },        
};

const DEVICE_TYPE = 
{
    devType:-1,
    uid:""
};

const DEVICE_INFO = 
{
    devID:"",           // Router: Wifi MAC to 8888(16chars), Tag: zigbee MAC 0120001077a15000
    hostname:"",        // Router-latest(4), Tag-latest(4)
    sn:"",              // 16 uid
    mac:"",             // 16 uid
    version:"3.1.23",
    type:"",            // Router, SenHub
    product:"",         // WISE-3001, WISE-1011
    manufacture:"",
    status:"1",
    commCmd:1,
    requestID:30002,
    agentID:"",
    handlerName:"general",
    parentID:"",        // 16 uid
    sendTS:160081026
};

const ESL_MANAGER_INFO =
{
    ID: "",
    Data: [],
    RF: []
}


// Global Variables
var gGwUid = '';

var gGwMap = new HashMap();     // key: GS's UID GW (WiFi MAC): 00:50:BA:48:12:03 ,    | Value: RF, InfoSpec, DevicInfo

// For Router, Tag Device Table
var gRouterMap = new HashMap(); // key: GS's UID Router(WiFi MAC): 00:50:BA:48:12:03 , | Value: RF, InfoSpec, DevicInfo
var gTagMap = new HashMap();    // key: GS's UID Tag (Zigbee MAC): 0120001077a15000),  | Value: RF, InfoSpec, DevicInfo

var gDevIDMap = new HashMap();  // key: AgentID                                        | Value: GS's UID ( Router: 00:50:BA:48:12:03 <-> 8888880050BA481203, Tag: 0120001077a15000 = 0120001077a15000

// For GS API / Function mapping hash table
var gIdfnMap = new HashMap();   // Key: Cmd : Type(1,2,3)-Id (1~0x300+15) ex: 1-1,     | Value:  GS_CMDID [type_id(matching)]
var gNamfnMap = new HashMap();  // Key: Cmd name: ex: "zd-get-router-list",            | Value:  GS_CMDID [name(matching)]
var gUrinMap = new HashMap();   // Key: Set uri_path: ex: "Info/router-zd-reboot",     | Value:  GS_CMDID [uri_path(matching)]


// For Action (GET/SET) session id wait
var gActionMap = new HashMap();  // for record Transaction ; matain time-out


// FW Image update variable
var gUpdating = 0; // 0: Non, 1: image, 2: fw

var path = '';

var show = function(data,x)
{
    console.log('data= '+JSON.stringify(data)+'path= '+x);
}


// ******** Basic Function ****************



// e.g.: low: 10000 high: 20000
function randomIntInc (low, high) {
    return Math.floor(Math.random() * (high - low + 1) + low);
}

var getTrnsactionId = function ()
{
    //return 1;

    return randomIntInc(TRANSACTION_ID_LOW,TRANSCATION_ID_HIGH);
}

var assignValue = function (des, value, key)
{
    for ( var i=0; i< des.length; i++ ) {
        if( des[i].n == key ) {
            if( typeof des[i].v !== 'undefined')
                des[i].v = value;
            else if ( typeof des[i].sv != 'undefined')
                des[i].sv = value;
            else if ( typeof des[i].bv != 'undefined')
                des[i].bv = value;
        }
    }
}

var getValue = function( src )
{
    //message = src.toString();
    //message = message.replace(/[\u0000-\u0019]+/g,""); // eric add to remove not viewable syntax 
    var jsrc = JSON.parse( JSON.stringify(src) );

    var value = 'undefined';

    if( typeof jsrc.v !== 'undefined' )
        value = jsrc.v;
    else if ( typeof jsrc.sv !== 'undefined' )
        value = jsrc.sv;
    else if ( typeof jsrc.bv !== 'undefined' )
        value = jsrc.bv;

    return value;
}

var getDevObjbyAgentId = function( agentId )
{

    var devObj = 'undefined';
    var sensorHub = 'undefined';

    if ( gDevIDMap.has(agentId) === true )
    {
        sensorHub = gDevIDMap.get(agentId);
        if (typeof sensorHub !== 'undefined') {
            if( sensorHub.devType === GS_DEVTYPE_ROUTER )
                devObj = gRouterMap.get( sensorHub.uid );
            else if ( sensorHub.devType === GS_DEVTYPE_TAG )
                devObj = gTagMap.get( sensorHub.uid );
        } 
    }

    return devObj;
}

// Description: Assign value by Key to real destination json obj's tag : Only supports one level json
// des: refer to ESL_GW_INFO
// value: "00124b00043a9749"
// key: "Info/zd-address"
var assignValueWithGroup = function (des, value, key)
{
    var ret = false;
    var uri = key.split('/'); // Info/DeviceList => Info:{e:[{}]} :

    if( typeof uri[0] === 'undefined' ) return ret;

    if( typeof des[uri[0]] === 'undefined' || typeof des[uri[0]].e === 'undefined' ) return ret;

    var data = des[uri[0]].e;

    for ( var i=0; i< data.length; i++ ) {
        if( data[i].n == uri[1] ) {
            ret = true;            
            if( typeof data[i].v !== 'undefined')
                data[i].v = value;                
            else if ( typeof data[i].sv != 'undefined')
                data[i].sv = value;
            else if ( typeof data[i].bv != 'undefined')
                data[i].bv = value;
        }
    }
    return ret;
}

var eventUpdateData = function( devObj )
{
    var eventType = -1;
    var eventMsgObj = {};
    switch( devObj.typeinfo.devType )
    {
        case GS_DEVTYPE_GW:
        {
            eventType = EVENT_ID.eConnectivity_UpdateData;
            eventMsgObj = genFullIoTGWData(devObj);
            console.log('[gw update data]= ');            
        }
        break;
        case GS_DEVTYPE_ROUTER:
        {
            eventType = EVENT_ID.eSenHub_UpdateData;
            eventMsgObj = genFullIoTGWData(devObj);
            
            console.log('[router update data]= ');                
        }
        break;
        case GS_DEVTYPE_TAG:
        {
            eventType = EVENT_ID.eSenHub_UpdateData;
            eventMsgObj = genFullSenHubData(devObj);
            console.log('[tag update data]= ' );  
        }
        break;
        default:
            console.log('[eventUpdateData] Unknow Device Type');
        break;
    }

    if( eventType == EVENT_ID.eSenHub_UpdateData )
        eventMsgObj.agentID = devObj.devinfo.agentID;

    console.log( JSON.stringify(eventMsgObj) );

    eventEmitterObj.emit(groupName, groupName, WSNEVENTS[eventType].event, eventMsgObj);    
}

var updateData = function( devObj, eslobj, pMap, update ) 
{   // Data Info
    for( var i=0; i< pMap.param.length; i++) {
         var s = pMap.param[i]['s'];
         var d = pMap.param[i]['d'];
         var tr = pMap.param[i]['tr'];
         if( typeof s != 'undefined' && typeof d != 'undefined' && typeof eslobj.Parameter[s] != 'undefined' )
         {
             var value = 'undefined';

             if( typeof tr == 'undefined' )            
                value = eslobj.Parameter[s];
             else
                value = tr(eslobj.Parameter[s]);

            if( value != 'undefined')
                assignValueWithGroup( devObj.datainfo, value, d )
         }
    }    
    if( update == 1)
        eventUpdateData( devObj );
}

var procReplyData = function( dstObj, eslobj, pMap )
{
    var sessionId = eslobj['Transaction-Id']; 
    var httpCode = STATUS.BAD_REQUEST;
    var code = eslobj['Code'];
    // 1. check transcation-id


    if( gActionMap.has(sessionId) == false ) return;
    
    var params = gActionMap.get(sessionId);

    console.log('reply from SDK '+ params);
    switch(code)
    {
        case GS_CODE.SUCCESS:
        { // 3.1 update
          if( typeof pMap.sync !== 'undefined' ) // If ok then sync set's value to Adv Structure
          {
            for( var i=0; i< pMap.param.length; i++) {
                var s = pMap.param[i]['s'];
                var d = pMap.param[i]['d'];
                if( typeof s != 'undefined' && typeof d != 'undefined' )
                    eslobj['Parameter'][s] = params[s];
            }
          }
          updateData( dstObj, eslobj, pMap , 1 );
          httpCode = STATUS.OK;
        }
        break;
        case GS_CODE.DEVICE_IS_BUSING:
        {
            httpCode = STATUS.SERVICE_UNABAILABLE;
        }   
        break;
        case GS_CODE.NOT_SUPPORT_CMD:
        case GS_CODE.PARAM_ERROR:
        {
            httpCode = STATUS.BAD_REQUEST;            
        }
        break;
        case GS_CODE.CMD_TIMEOUT:
        {
            httpCode = STATUS.REQUEST_TIMEOUT;        
        }
        break;
        default:
        httpCode =  STATUS.INTERNAL_SERVER_ERROR;       
    }
   
    if( typeof params.cb !== 'undefined' && typeof params.res !== 'undefined' ) // HTTP Response
    {
        console.log('reply http code '+ httpCode);
        params.cb(params.res, httpCode, '');
    }
    // 4. remove
    gActionMap.remove(sessionId);
}

// input: [1,2,3]
// output: 1,2,3
var arrayToString = function(input)
{
    var outValue = '';
    if ( typeof input == 'object' )
    {
        for ( var i=0; i< input.length; i++)
            outValue += input[i] + ',';
    }

    outValue= outValue.replace(/,$/,'');
    //console.log('rm array= '+ outValue);

    return outValue;
}

var appendCode = function( fill, num )
{
    var code = "";
    for( var i=0; i< num ; i++) {
        code += fill;
    }
    return code;
}

// Input: 00:50:BA:48:12:03 
// Output: 8888880050BA481203
var convert2WISE16Id = function ( src )
{
    var uid = '';
    var len = src.length;
    var tmp = '';

    if ( len > 0 ) {
        tmp = src.replace(/[:-]/g,'');
        len = tmp.length;
        if( len < 16 ) // padding '0' to 16 characters
            uid =  appendCode( '8', 16 - len ) + tmp;
    }
    return uid;
}   

var routerListMACtoAgentId = function(input)
{
    var outValue = '';
    if ( typeof input == 'object' )
    {
        for ( var i=0; i< input.length; i++)
            outValue += convert2WISE16Id(input[i]) + ',';
    }

    outValue= outValue.replace(/,$/,'');
    //console.log('rm array= '+ outValue);

    return outValue;    
}

// input: 1,2,3
// output: [1,2,3]
var stringToArray = function(input)
{
    var outValue = [];

    if( typeof input == 'string'){
        var inData = input.split(',');
        for(var i=0; i<inData.length; i++)
            outValue.push(inData[i]);
    }
    //console.log('sTa= '+ JSON.stringify(outValue));
    //console.log('sTa= '+ outValue);
    return outValue;
}

// ************** End of Basic Function ***************



// fnName: get-tag-list
// params: {p1:}
var esl_ActionRequest = function ( fnName, params )
{
    //console.log('param= ',JSON.stringify(params));
    if( gNamfnMap.has(fnName) == true ) {
        var actionMap = gNamfnMap.get(fnName);
        actionMap.fun( actionMap, params );
    }    
}


var genFullSenHubData = function( devObj )
{
    var senhub = {};
    senhub.SenHub = devObj.datainfo;
    return senhub;
}

var genFullIoTGWData = function( devObj ) // GW or Router devObj
{
    var iotgw = JSON.parse(JSON.stringify(IOT_GW));    
    iotgw.IoTGW[devObj.rfinfo.rf] = {};
    iotgw.IoTGW[devObj.rfinfo.rf][devObj.rfinfo.mac]={};
    iotgw.IoTGW[devObj.rfinfo.rf].bn = devObj.rfinfo.rf;
    iotgw.IoTGW[devObj.rfinfo.rf][devObj.rfinfo.mac]=devObj.datainfo;
    iotgw.IoTGW[devObj.rfinfo.rf][devObj.rfinfo.mac].bn = devObj.rfinfo.mac;

    return iotgw; 
}

var procGWReg = function( topic, eslobj, pMap ) 
{
    if( typeof eslobj.Parameter[pMap.uid] == 'undefined' ) return;
   
    var gwObj = 'undefined';
    var uid = eslobj.Parameter[pMap.uid];

    if( gGwMap.has(uid) == true ) return;

    gwObj = {};    
        
    // Prepare GW Object
    var rfobj = JSON.parse(JSON.stringify(RF_INFO));
    var dataobj = JSON.parse(JSON.stringify(ESL_GW_INFO));
    var devType = JSON.parse(JSON.stringify(DEVICE_TYPE)); 

    devType.devType = GS_DEVTYPE_GW;
    devType.uid = uid;

    // RF Protocol
    rfobj.rf = pMap.protocol;
    rfobj.mac = eslobj.Parameter[pMap.mac];
    rfobj.uid = eslobj.Parameter[pMap.uid];
    rfobj.num = 0;

    gwObj.rfinfo = rfobj;
    gwObj.datainfo = dataobj;
    gwObj.typeinfo = devType;

    
    gGwUid = uid;

    // Update Data Info
    updateData( gwObj, eslobj, pMap, 0 );

    gGwMap.set(uid, gwObj);

    console.log('[gw regist] ', JSON.stringify(gwObj));

    // To query DeviceList(zd-get-router-list) & permit-tag-list value
    esl_ActionRequest('get-permit-tag-list','');
    esl_ActionRequest('zd-get-router-list','');
    //esl_ActionRequest('gateway-zd-reboot','');

    // send event eConnectivity_Capability
    var eventMsgObj = genFullIoTGWData(gwObj);
    console.log('[gw reg event] '+ JSON.stringify(eventMsgObj));
    eventEmitterObj.emit(groupName, groupName, WSNEVENTS[EVENT_ID.eConnectivity_Capability].event, eventMsgObj);
}



var fillDeviceInfo = function( dst, type, uid, agentid, name, parentId )
{
    dst.devID = agentid;
    dst.hostname = name + '-'+ uid.substr(uid.length-4);
    dst.sn = uid;
    dst.mac = uid;
    dst.type = type,
    dst.product = name;
    dst.parentID = parentId;
    dst.agentID = agentid;
    dst.sendTS = new Date().getTime();
}



var procRouterReg = function( topic, eslobj, pMap ) {
   
    if( typeof eslobj.Parameter[pMap.uid] == 'undefined' ) return;

    var routerObj = 'undefined';
    var uid = eslobj.Parameter[pMap.uid];

    var rfobj = JSON.parse(JSON.stringify(RF_INFO));
    var dataobj = JSON.parse(JSON.stringify(ESL_ROUTER_INFO));    
    var devobj = JSON.parse(JSON.stringify(DEVICE_INFO));
    var devType = JSON.parse(JSON.stringify(DEVICE_TYPE)); 

    if( gRouterMap.has(uid) == true ) return; //  to prevent re-gister twice


    // A New Router registration
    routerObj = {};
    var gwObj = 'undefined';
    gwObj = gGwMap.get(gGwUid);
      
    
    if( typeof gwObj != 'undefined')
        gwObj.rfinfo.num = gwObj.rfinfo.num + 1;
    else
    {
        console.log('[procRouterReg] can not find gw');
        esl_ActionRequest('gw-re-register', '');
        return; // need follow register secquence
    }

    var tagMap = new HashMap();  // key: tag's UID

    // DeviceInfo
    // AgentID
    var agentId = convert2WISE16Id(uid);
 
    fillDeviceInfo(devobj, 'Router', uid, agentId, ESL_ROUTER_NAME, "" );


    devType.devType = GS_DEVTYPE_ROUTER;
    devType.uid = uid;

    gDevIDMap.set(agentId,devType);

    // RF Protocol
    rfobj.rf = pMap.protocol;
    rfobj.mac = eslobj.Parameter[pMap.mac];
    rfobj.uid = eslobj.Parameter[pMap.uid];

    // Assign to dev
    routerObj.rfinfo = rfobj;
    routerObj.datainfo = dataobj;
    routerObj.devinfo = devobj;
    routerObj.typeinfo = devType;
    routerObj.taginfo = tagMap;

    // Update Data Info
    updateData( routerObj, eslobj, pMap, 0 );
 
    gRouterMap.set(uid, routerObj);
    
    console.log('[router regist] ', JSON.stringify(routerObj));
 

    var param = {};
    param['devId'] = uid;

    esl_ActionRequest('get-tag-list', param);
    esl_ActionRequest('get-zd-tx-power-r', param);

    // send event eSenHub_Connected: note + susiCommData{eSenHub_Capability}
    var eventMsgObj = {};
    eventMsgObj.susiCommData = routerObj.devinfo;
    eventEmitterObj.emit(groupName, groupName, WSNEVENTS[EVENT_ID.eSenHub_Connected].event, eventMsgObj);   
    console.log('[router reg event] '+ JSON.stringify(eventMsgObj));

    eventMsgObj = {};
    eventMsgObj = genFullIoTGWData(routerObj);
    eventMsgObj.agentID = routerObj.devinfo.agentID;
    eventEmitterObj.emit(groupName, groupName, WSNEVENTS[EVENT_ID.eSenHub_Capability].event, eventMsgObj);  
    console.log('[router reg event] '+ JSON.stringify(eventMsgObj));    
    
    // To query gateway's devicelist
    esl_ActionRequest('zd-get-router-list','');

}

var procTagReg = function( topic, eslobj, pMap ) {
    
    if( typeof eslobj.Parameter[pMap.uid] == 'undefined' ) return;

    var tagObj = 'undefined';
    var uid = eslobj.Parameter[pMap.uid];

    var rfobj = JSON.parse(JSON.stringify(RF_INFO));    
    var dataobj = JSON.parse(JSON.stringify(ESL_TAG_INFO));    
    var devobj = JSON.parse(JSON.stringify(DEVICE_INFO));
    var devType = JSON.parse(JSON.stringify(DEVICE_TYPE)); 
    
    if( gTagMap.has(uid) == true ) return; //  to prevent re-gister twice

    tagObj = {};
    var routerObj = 'undefined';
    routerObj = gRouterMap.get(eslobj.Parameter[pMap.parentid]);
    if( typeof routerObj != 'undefined') {
        routerObj.rfinfo.num = routerObj.rfinfo.num + 1; 
        routerObj.taginfo.set(uid,'');      // <NOT Finish>             
    }else{
        var param = {};
        param['devId'] = eslobj.Parameter[pMap.parentid];
        esl_ActionRequest('router-re-register',param );
        console.log('can not find router ' + eslobj.Parameter[pMap.parentid]);        
        return; // need follow register secquence
    }


    // DeviceInfo
    var parentId = "";
    if( typeof eslobj.Parameter[pMap.parentid] != 'undefined' )
        parentId = convert2WISE16Id(eslobj.Parameter[pMap.parentid]);
    else
        console.log('[tag regist] can not find object!');      

    console.log('[tag regist] parentId', parentId );

    fillDeviceInfo(devobj, 'Tag', uid, uid, ESL_TAG_NAME, parentId );
    
    devType.devType = GS_DEVTYPE_TAG;
    devType.uid = uid;

    gDevIDMap.set(uid,devType);

    // RF Protocol
    rfobj.rf  = pMap.protocol;
    rfobj.mac = eslobj.Parameter[pMap.mac];
    rfobj.uid = eslobj.Parameter[pMap.uid];   

    tagObj.rfinfo   = rfobj;
    tagObj.datainfo = dataobj;
    tagObj.devinfo  = devobj;
    tagObj.typeinfo = devType;
    tagObj.parent = eslobj.Parameter[pMap.parentid];
    
    // Update Data Info
    updateData( tagObj, eslobj, pMap, 0 );
     
    gTagMap.set(uid, tagObj);

    console.log('[tag regist] ', JSON.stringify(tagObj));
    

    // <Not> To query  & tx-level value

    // <Not> send event eSenHub_Connected: note + susiCommData + eSenHub_Capability
    // send event eSenHub_Connected: note + susiCommData{eSenHub_Capability}
    var eventMsgObj = {};
    eventMsgObj.susiCommData = tagObj.devinfo;
    eventEmitterObj.emit(groupName, groupName, WSNEVENTS[EVENT_ID.eSenHub_Connected].event, eventMsgObj);   
    console.log('[tag reg event] '+ JSON.stringify(eventMsgObj));

    eventMsgObj = {};
    eventMsgObj = genFullSenHubData(tagObj);
    eventMsgObj.agentID = tagObj.devinfo.agentID;
    eventEmitterObj.emit(groupName, groupName, WSNEVENTS[EVENT_ID.eSenHub_Capability].event, eventMsgObj);  
    console.log('[tag reg capability] '+ JSON.stringify(eventMsgObj));     
    
    // router to query tag-list
    var param = {};
    param['devId'] = tagObj.parent;

    esl_ActionRequest('get-tag-list', param);    
}

var procGWReport = function( topic, eslobj, pMap ) 
{
    if( typeof eslobj.Parameter[pMap.uid] == 'undefined' ) return;
    
    var uid = eslobj.Parameter[pMap.uid];
    
    var gwObj = 'undefined';
    var uid = eslobj.Parameter[pMap.uid];

    if( gGwMap.has(uid) == false ) 
    {
        // gw re-register
        esl_ActionRequest('gw-re-register', '');
        return;
    }
        
    gwObj= gGwMap.get(uid); // router exist do nothing
    
    if( gwObj === 'undefined' ) return;

    // Update Data Info
    updateData( gwObj, eslobj, pMap , 1 );

    // if number does not match to query router list again
    if( gwObj.rfinfo.num !=  eslobj.Parameter['router-number'])
    {   
        // re-sync
    } 

    console.log('[gw report] ', JSON.stringify(gwObj.datainfo));        
}

var procRouterReport = function( topic, eslobj, pMap ) 
{
    if( typeof eslobj.Parameter[pMap.uid] == 'undefined' ) return;
    
    var uid = eslobj.Parameter[pMap.uid];
    
    var devObj = 'undefined';
    var uid = eslobj.Parameter[pMap.uid];

    if( gRouterMap.has(uid) == false ) 
    {
        // router re-register        
        var param = {};
        param['devId'] = eslobj.Parameter[pMap.parentid];        
         esl_ActionRequest('router-re-register', param);
        return;
    }   

    devObj= gRouterMap.get(uid); // router exist do nothing

    // Update Data Info
    updateData( devObj, eslobj, pMap , 1 );

    // if number does not match to query tag list again
    if( devObj.rfinfo.num !=  eslobj.Parameter['tag-number'])
    {   
        // re-sync this router's tag
    }     

    console.log('[router report] ', JSON.stringify(devObj.datainfo));       
}

var procTagReport = function( topic, eslobj, pMap ) 
{
    if( typeof eslobj.Parameter[pMap.uid] == 'undefined' ) return;
    
    var uid = eslobj.Parameter[pMap.uid];
    
    var tagObj = 'undefined';
    var uid = eslobj.Parameter[pMap.uid];

    if( gTagMap.has(uid) == false ) 
    {
        // router re-register        
        var param = {};
        param['devId'] = uid;       
        esl_ActionRequest('tag-re-register', param);        
        return;
    }

    tagObj= gTagMap.get(uid); // router exist do nothing

    // Update Data Info
    updateData( tagObj, eslobj, pMap , 1 );

    console.log('[tag report] ', JSON.stringify(tagObj.datainfo));       
}


var RemoveRouter = function( uid )
{
    var devObj = 'undefined';
    var tagObj = 'undefined';

    if( gRouterMap.has(uid) == true )  
    {
        devObj = gRouterMap.get(uid);     

        if( typeof devObj === 'undefined') return;

        devObj.taginfo.forEach(function(obj, key) { // key => tag's uid
            tagObj = gTagMap.get(key);
            if( typeof tagObj !== 'undefined' ) 
            {
                var eventMsgObj ={};
                tagObj.devinfo.status = 0;
                eventMsgObj.susiCommData = tagObj.devinfo;
                eventEmitterObj.emit(groupName, groupName, WSNEVENTS[3].event, eventMsgObj);     
                gTagMap.remove(key);   
                gDevIDMap.remove(key);
            }
        });         
        gRouterMap.remove( uid );
        gDevIDMap.remove( uid );
    }         
}

var RemoveTag = function( uid )
{
    var routerObj = 'undefined';
    var tagObj = 'undefined';
    
    // remove tag info
    if( gTagMap.has(uid) == false ) return;

    tagObj = gTagMap.get(uid);

    if( typeof tagObj === 'undefined' ) return;

    gTagMap.remove(uid);

    gDevIDMap.remove(uid);
    // remove tag info from router 
    routerObj = gRouterMap.get(tagObj.parent);

    console.log('router '+routerObj );
    if( typeof routerObj === 'undefined' ) return;
    console.log('router 222'+routerObj );
    routerObj.taginfo.remove(uid);

    routerObj.rfinfo.num = routerObj.rfinfo.num - 1;
}

var procEmergancyReport = function( topic, eslobj, pMap ) 
{
    if( typeof eslobj.Parameter[pMap.uid] == 'undefined' ) return;
    
    var devObj = 'undefined';
    var type = eslobj.Parameter[pMap.type];    
    var uid = eslobj.Parameter[pMap.uid];
    var code = eslobj.Parameter[pMap.code];

    switch(type)
    {
        case 0x10: // gw
            if( gGwMap.has(gGwUid) == true )   devObj = gGwMap.get(gGwUid);
        break;
        case 0x20: // router
            if( gRouterMap.has(uid) == true )  devObj = gRouterMap.get(uid);
        break;
        case 0x30: // tag
            if( gTagMap.has(uid) == true )     devObj = gTagMap.get(uid);
        break;
        default:
            console.log('[Emergancy] Unknow Device Type!');
    }

    if( typeof devObj === 'undefined' ) return;

    switch(code)
    {
        case GS_CODE.DISCONNECT: //disconnect
        {
            if( type ==  32 || type == 48 ) // send disconnect event 
                if( type == 32 )
                    RemoveRouter(uid);
                else
                    RemoveTag(uid);

                var eventMsgObj ={};
                devObj.devinfo.status = 0;
                eventMsgObj.susiCommData = devObj.devinfo;
                eventEmitterObj.emit(groupName, groupName, WSNEVENTS[3].event, eventMsgObj);  
        }
        break;
        default:
            console.log('[Emergancy] Unknow Error Code: '+ code);
    }
       
}

var procStatusReport = function( topic, eslobj, pMap ) 
{
    if( typeof eslobj.Parameter[pMap.uid] == 'undefined' ) return;
    
    var devObj = 'undefined';
    //var type = eslobj.Parameter[pMap.type];    
    var uid = eslobj.Parameter[pMap.uid];
    //var status = eslobj.Parameter[pMap.status];

    // switch(type)
    // {
    //      case 0x10: // gw
    //         if( gGwMap.has(uid) == true )      devObj = gGwMap.get(uid);
    //     break;
    //     case 0x20: // router
    //         if( gRouterMap.has(uid) == true )  devObj = gRouterMap.get(uid);
    //     break;
    //     case 0x30: // tag
    //         if( gTagMap.has(uid) == true )     devObj = gTagMap.get(uid);
    //     break;
    //     default:
    //         console.log('[Emergancy] Unknow Device Type!');
    // }
    if( gTagMap.has(uid) == true ) 
    {
         devObj = gTagMap.get(uid);
         type = 2;
    }
    else if( gRouterMap.has(uid) == true )  
    {
        devObj = gRouterMap.get(uid);
        type = 1;
    }
    else if( gGwMap.has(uid) == true )      
    {
        devObj = gGwMap.get(uid);
    }

    if( devObj === 'undefined' ) return;


    updateData( devObj, eslobj, pMap , 1 );
}

/*
    Processreply of actions
*/ 
var procGWRsp = function( topic, eslobj, pMap )
{
    var dstObj = 'undefined';

    if( gGwMap.has(gGwUid) == false ) return;
        
    dstObj= gGwMap.get(gGwUid); // router exist do nothing

    procReplyData( dstObj, eslobj, pMap );

    console.log('[gw rsp] ', JSON.stringify(dstObj.datainfo));     
}

var procRouterRsp = function( topic , eslobj, pMap )
{
    var dstObj = 'undefined';
    var uid = eslobj.Parameter[pMap.uid];

    if( gRouterMap.has(uid) == false ) return;

    dstObj= gRouterMap.get(uid); 

    procReplyData( dstObj, eslobj, pMap ); 

    console.log('[router rsp] ', JSON.stringify(dstObj.datainfo));
}

var procTagRsp = function( topic , eslobj, pMap )
{
    var dstObj = 'undefined';
    var uid = eslobj.Parameter[pMap.uid];

    if( gTagMap.has(uid) == false ) return;

    dstObj = gTagMap.get(uid); 

    procReplyData( dstObj, eslobj, pMap );

    console.log('[tag rsp] ', JSON.stringify(dstObj.datainfo));
}




// paramVals: e.g. set-zd-tx-power: {"router-addr":"00124b00043a9749", "tx-level": 3 }
var sendAction = function( pMap, paramVals )
{
    var msg = '';
    var key = pMap.type_id.toString().split('-');
    var eslobj = JSON.parse(JSON.stringify(GS_JSON_FORMAT));   
    var timeout = TIMEOUT;

    // To create a new transaction id
    var sessionId = getTrnsactionId();
    // Header
    eslobj['Cmd-Type'] =   parseInt( key[0], 10 );
    eslobj['Cmd-Id'] = parseInt( key[1], 10 );
    eslobj['Transaction-Id'] = sessionId;


    // param    
    for( var i=0; i< pMap.param.length; i++) {
        var s = pMap.param[i]['s'];

        if( typeof s != 'undefined' )
        {
            if( typeof paramVals[s] != 'undefined' )
                eslobj.Parameter[s] = paramVals[s];
            else
              console.log('[els manager action error] param not found');
        }
    }

    // create transaction-id table
    gActionMap.set(sessionId,paramVals);

    // send mqtt message
    msg = JSON.stringify(eslobj);

    console.log('[sendAction] data ', msg );

    Client.publish(GS_MQTT_SUB, msg);

    if( typeof paramVals['timeout'] !== 'undefined')
        timeout = paramVals['timeout'];

    if( typeof paramVals['cb'] !== 'undefined' )
    {
        setTimeout(function () {
            //console.log('[Timeout] session ID === ' + sessionId );
            if ( gActionMap.has(sessionId) === true){
            var actObj = gActionMap.get(sessionId);
                if ( typeof actObj !== 'undefined' ){                
                    var cbf = paramVals['cb'];
                    cbf(paramVals.res, STATUS.REQUEST_TIMEOUT, '');
                    gActionMap.remove(sessionId);
                    console.log('[Timeout] sessionId.count() = ' + gActionMap.count())
                }
            }
        } , timeout, sessionId);   
    } 

}

// devid = { "devId":"00124b00043a9749"}
// Only needs to set one parameter 'device id' with "Get Command"
var getCmd = function( pMap, input )
{
    var param = {};

    if( pMap.dev === GS_DEVTYPE_ROUTER )
        param['router-addr'] = input['devId'];
    else if ( pMap.dev === GS_DEVTYPE_TAG )
        param['tag-addr'] = input['devId'];

    console.log('[getCmd] '+JSON.stringify(pMap));
    sendAction( pMap, param );
}



// input : { "devId":"00124b00043a9766", "tx-level": 3 } or { "Info/permit-tag-list":"00124b00043a9766","00124b00043a9776"}
// This function only for general params set, fw/image has special function
var setCmd = function( pMap, input )
{
    var param = {};

    // prepare set Parameter
    for( var i=0; i< pMap.param.length; i++) {
        var s = pMap.param[i]['s'];
        //var d = pMap.param[i]['d'];
        if( typeof s != 'undefined' )
        {
            //if( typeof d == 'undefined' || input[d] == 'undefined' ) { console.log('[esl Error setCmd] Not Found param ' + s); return; }
            param[s] = input[s];
        }
    }

    if( pMap.dev === GS_DEVTYPE_ROUTER )
        param['router-addr'] = input['devId'];
    else if ( pMap.dev === GS_DEVTYPE_TAG )
        param['tag-addr'] = input['devId'];
    

    if( typeof input['res'] !== 'undefined' && typeof input['cb'] !== 'undefined' )
    {
        param.res = input['res'];
        param.cb = input['cb'];
    }

    console.log('[setCmd] '+JSON.stringify(pMap));
    sendAction( pMap, param  );
}


const  POLY = 0x4C11DB7;
const  CRC_INITIALVALUE  = 0xFFFFFFFF;

var crc32 = function( data, len )
{
    var sum = CRC_INITIALVALUE;
    for( var i=0; i< len; i++)
    {
        var byte = data[i];
        
        for( var j=0; j<8; ++j)
        {
            var osum = sum;
            sum <<= 1;
            if( byte & 0x80 )
                sum |= 1;
            if( osum & 0x80000000 )
                sum ^= POLY;

            byte <<=1;

        }

    }
    return sum; 
}

var procImageUpdate = function( pMap, input )
{
    var param = {};
    var fs = require('fs');
    //var crc16 = require('../../node_modules/node-crc16/index.js');
    var imagename = '';
    var value = getValue(input.data);   

    // Decode base 64
    var buf = new Buffer(value, 'base64'); 
    // image-crc code   
    //var sum = crc16.checkSum(buf, 'hex');
    var crc32_sum = crc32(buf,buf.byteLength);
    console.log('sum= '+crc32_sum.toString(16));
    var sum = crc32_sum.toString(16);

    // image-name
    imagename = FTP_FOLDER_PATH + 'image-'+sum+'.esl';   
    //imagename = 'd33_demo';
    console.log('updage image file= '+imagename + ' tag-id: '+ input['devId']);

    // check image exist ?
    if (fs.existsSync(imagename) === false ) {
        fs.writeFileSync( imagename, buf );
    }
      
    console.log('ImageUpdate Tag-Id: '+ input['devId'] + ' image file: ' + imagename);    

    // basic http info
    param.res = input['res'];
    param.cb = input['cb'];
    param['timeout'] = 120000; // 120 sec

    // cmd parameters
    param['tag-addr'] = input['devId'];
    param['image-name'] = 'image-'+sum;
    param['image-crc'] = sum;

    // Not finished => Remove Image file
    sendAction( pMap, param  );
}



// ESL API
// --------------- PUT -------------------------------------------

// ==================  Gateway  =================================

var setESLGWUpdateFW = function( pMap, input )
{
    var params = {};
    var sParams = JSON.parse(input.data);
 
    params['devId'] = gGwUid;
    params['fw-name'] = sParams['zd-fw-name'];
    params['fw-version'] = sParams['zd-fw-version'];
    params['fw-crc'] = sParams['zd-fw-crc'];
    console.log('[setESLGWUpdateFW] '+JSON.stringify(params));
    esl_ActionRequest('gw-zd-fw-update', params);

    input.cb(input.res, STATUS.ACCEPTED, '{"sv":"ACCEPTED GW FW Update "}');
}

// ==================    Router   ===============================
var setRouterFW_T = function( pMap, input )
{
    var param = {};
    
    param['router-addr'] = input['devId'];
    params['fw-name']    = input['zd-t-fw-name'];
    params['fw-version'] = input['zd-t-fw-version'];
    params['fw-crc']     = input['zd-t-fw-crc'];

    console.log('[setRouterFW_T] '+JSON.stringify(pMap));
    esl_ActionRequest('zd-fw-update-t', params);
}

var setRouterFW_R = function( pMap, input )
{
    var param = {};
    
    param['router-addr'] = input['devId'];
    params['fw-name']    = input['zd-r-fw-name'];
    params['fw-version'] = input['zd-r-fw-version'];
    params['fw-crc']     = input['zd-r-fw-crc'];

    console.log('[setRouterFW_R] '+JSON.stringify(pMap));
    esl_ActionRequest('zd-fw-update-r', params);
}


// URI:  restapi/WSNManager/ESL/Router/All/zd-fw-update
// Data: {"zd-t-fw-name":"router-zd-t-v1","zd-t-fw-version":1,"zd-t-fw-crc":"ff63", "zd-r-fw-name":"router-zd-r-v1","zd-r-fw-version":1,"zd-r-fw-crc":"ff63"}
var setESLRouterUpdateFW = function( pMap, input )
{
    var params = {};
    var sParams = JSON.parse(input.data);
 
    gRouterMap.forEach(function(obj, key) {
        params = {};
        params['devId'] = key; // WiFi MAC
        params['fw-name'] = sParams['zd-t-fw-name'];
        params['fw-version'] = sParams['zd-t-fw-version'];
        params['fw-crc'] = sParams['zd-t-fw-crc'];
        console.log('[setESLRouterUpdateFW] '+JSON.stringify(params));
        esl_ActionRequest('zd-fw-update-t', params);
        esl_ActionRequest('zd-fw-update-r', params);
    });

    input.cb(input.res, STATUS.ACCEPTED, '{"sv":"ACCEPTED All Routers FW Update "}');
}

// URI:  restapi/WSNManager/ESL/Tag/All/zd-fw-update
// Data: {"zd-fw-name":"tag-zd-v1","zd-fw-version":1,"zd-fw-crc":"f1c0"}
var setESLTagUpdateFW = function( pMap, input )
{
    var params = {};
    var sParams = JSON.parse(input.data);
 
    gTagMap.forEach(function(obj, key) {
        params = {};
        params['devId'] = key; // Zigbee MAC
        params['fw-name'] = sParams['zd-fw-name'];
        params['fw-version'] = sParams['zd-fw-version'];
        params['fw-crc'] = sParams['zd-fw-crc'];
        console.log('[setESLTagUpdateFW] '+JSON.stringify(params));
        esl_ActionRequest('tag-zd-fw-update', params);
    });

    input.cb(input.res, STATUS.ACCEPTED, '{"sv":"ACCEPTED All Tags FW Update "}');
}

var getESLGWInfo = function( actionMap, parmas )
{
    var ret = STATUS.NOT_FOUND;
    var emi = JSON.parse(JSON.stringify(ESL_MANAGER_INFO)); 
    var gwObj = gGwMap.get(gGwUid);
    var data = {List:[]};  
    var txlevel = 0;

    if( typeof gwObj !== 'undefined')  
    {
        txlevel = findResourcebyName(gwObj.datainfo.Info, 'tx-level'); 
        emi.ID =  '-';
        emi.Data.push({n:'Router Number', sv:gwObj.rfinfo.num});
        emi.Data.push({n:'Zigbee', sv:gwObj.rfinfo.mac});
        emi.RF.push({n:'TX Power', sv: txlevel.v});  
        data.List.push(emi);
    }

    parmas.outObj.ret = JSON.stringify(data);

    ret = STATUS.OK;
    return ret;
}

var getESLRouterInfo = function( actionMap, parmas )
{
    var ret = STATUS.NOT_FOUND;
    var emi = {}; 
    var txlevel = 0;
    var data = {List:[]};     
    if ( gRouterMap.count() > 0 ) 
    {
        gRouterMap.forEach(function(obj, key) {
            emi = JSON.parse(JSON.stringify(ESL_MANAGER_INFO)); 
            txlevel = findResourcebyName(obj.datainfo.Info, 'tx-level-t');


            emi.ID =  obj.devinfo.devID;
            emi.Data.push({n:'Tag Number', sv:obj.rfinfo.num});
            emi.Data.push({n:'Zigbee', sv:obj.rfinfo.mac});
            emi.RF.push({n:'TX Power', sv: txlevel.v});  
            data.List.push(emi);
        });
    }

    parmas.outObj.ret = JSON.stringify(data);

    ret = STATUS.OK;
    return ret;
}

var getESLTagInfo = function( actionMap, parmas )
{
    var ret = STATUS.NOT_FOUND;
    var emi = {}; 
    var txlevel = 0;
    var image = '';
    var uriList = parmas.uri.split('/');    

    var data = {List:[]};     
    if ( gRouterMap.count() > 0 ) 
    {
        var routerObj = getDevObjbyAgentId(uriList[2]);
        if( typeof routerObj !== 'undefined' )
        {
            routerObj.taginfo.forEach(function(d,key) {
            var obj = getDevObjbyAgentId(key);
            if( obj !== 'undefined'){
                emi = JSON.parse(JSON.stringify(ESL_MANAGER_INFO)); 
                txlevel = findResourcebyName(obj.datainfo.Net, 'tx-level');
                image = findResourcebyName(obj.datainfo.SenData, 'image-crc');

                emi.ID =  obj.devinfo.devID;
                emi.Data.push({n:'Image-CRC', sv:image.sv});
                emi.Data.push({n:'Zigbee', sv:obj.rfinfo.mac});
                emi.RF.push({n:'TX Power', sv: txlevel.v});  
                data.List.push(emi);
            }
            });
        }
    }

    parmas.outObj.ret = JSON.stringify(data);

    ret = STATUS.OK;
    return ret;
}



var GS_CMDID = {
    GS_PROTOCOL: [
                    // ============= Report  ==========================================
                    { 
                      type_id:'1-1', dev: GS_DEVTYPE_GW, name:'gateway-registration', protocol: 'Zigbee', mac:'zdr-address', uid: 'device-ieeeadr',
                      param:[{s:'device-ieeeadr'},{s:'ip'},{s:'zdr-address'},{s:'pan-id',d:'Info/pan-id'},{s:'zd-channel',d:'Info/zd-channel'},{s:'zd-fw-version',d:'Info/zd-fw-version'}], 
                      fun: procGWReg
                    }, // Tested

                    { 
                      type_id:'1-2', dev: GS_DEVTYPE_ROUTER, name:'router-registration', protocol: 'Zigbee', mac:'zdr-address', uid: 'device-ieeeadr', 
                      param:[{s:'device-ieeeadr'},{s:'ip'},{s:'zdt-address'},{s:'zdt-fw-version',d:'Info/zd-fw-version'},
                             {s:'zdr-address'},{s:'zdr-fw-version'}], 
                      fun: procRouterReg
                    },    

                    {                                                                                                                   
                      type_id:'1-3', dev: GS_DEVTYPE_TAG, name:'tag-registration', protocol: 'Zigbee', mac:'device-ieeeadr', uid: 'device-ieeeadr', parentid: 'parent-ieeeaddr',
                      param:[{s:'device-ieeeadr'},{s:'tx-level',d:'Net/tx-level'},{s:'image-crc',d:'SenData/image-crc'},{s:'tag-type', d:'SenData/panel-type'},
                      {s:'rssi',d:'Net/rssi'},{s:'channel',d:'Net/channel'},{s:'fw-version',d:'Info/fw-version'},{s:'default-image'},{s:'timeout', d:'Info/timeout'},
                      {s:'data-request-period',d:'Info/data-request-period'},{s:'state-report-period',d:'Info/state-report-period'}], 
                      fun: procTagReg
                    },

                    { 
                        type_id:'1-4', dev: GS_DEVTYPE_GW, name:'gateway-report', uid: 'device-ieeeadr',
                        param:[{s:'device-ieeeadr'},{s:'router-number',d:'Info/device-number'}], 
                        fun: procGWReport
                    },   

                    { 
                        type_id:'1-5', dev: GS_DEVTYPE_ROUTER, name:'router-report', uid: 'device-ieeeadr',
                        param:[{s:'device-ieeeadr'},{s:'tag-number',d:'Info/device-number'}], 
                        fun: procRouterReport
                    },   

                    { 
                        type_id:'1-6', dev: GS_DEVTYPE_TAG, name:'tag-report', uid: 'device-ieeeadr',
                        param:[{s:'device-ieeeadr'},{s:'parent-ieeeadr'},{s:'Battery',d:'Info/battery'},{s:'total-image-crc',d:'SenData/image-crc'},{s:'rssi',d:'Net/rssi'}], 
                        fun: procTagReport
                    },

                    { 
                        type_id:'1-7', dev: GS_DEVTYPE_GENERAL, name:'emergancy report', uid: 'device-address', type: 'device-type', code: 'error-code', 
                        fun: procEmergancyReport
                    },

                    { 
                        type_id:'1-8', dev: GS_DEVTYPE_GENERAL, name:'Status-change', uid: 'device-address', type: 'device-type', status: 'Status-channge', 
                        param:[{s:'Status-channge', d:'Info/stauts'}], 
                        fun: procStatusReport
                    },                       
                    // ============= Report  ==========================================



                    // ============= Action  ===========================================

                    // ----------------- GW 257 ~ 267   ---------------------------------
                    { 
                        type_id:'2-258', dev: GS_DEVTYPE_GW, name:'gw-re-register', uid: '', action_type:'set', uri_path: '',
                        param:[{s:''}], 
                        fun: setCmd
                    }, 

                    { 
                        type_id:'2-259', dev: GS_DEVTYPE_GW, name:'zd-setup-securekey', uid: '', action_type:'set', uri_path: 'ESL-GW/Info/zd-securekey',
                        param:[{s:'secure-key'}], 
                        fun: setCmd
                    }, 

                    { 
                        type_id:'3-259', dev: GS_DEVTYPE_GW, name:'zd-setup-securekey-rsp', uid: '', action_type:'rsp',
                        param:[{}], 
                        fun: procGWRsp
                    },                    

                    { 
                        type_id:'2-260', dev: GS_DEVTYPE_GW, name:'add-permit-tag-list', uid: '', action_type:'set', uri_path: 'ESL-GW/Info/add-permit-tag-list',
                        param:[{s:'device-ieeeadr-list',tr:stringToArray}], 
                        fun: setCmd
                    }, 
                    { 
                        type_id:'3-260', dev: GS_DEVTYPE_GW, name:'add-permit-tag-list-rsp', uid: '', action_type:'rsp', 
                        param:[{s:'device-ieeeadr-count'},{s:'device-ieeeadr-list',d:'Info/permit-tag-list', tr:arrayToString}], 
                        fun: procGWRsp
                    },  
                    
                    { 
                        type_id:'2-261', dev: GS_DEVTYPE_GW, name:'remove-permit-tag-list', uid: '', action_type:'set', uri_path: 'ESL-GW/Info/remove-permit-tag-list',
                        param:[{s:'device-ieeeadr-list',tr:stringToArray}], 
                        fun: setCmd
                    }, 
                    { 
                        type_id:'3-261', dev: GS_DEVTYPE_GW, name:'remove-permit-tag-list-rsp', uid: '', action_type:'rsp', 
                        param:[{s:'device-ieeeadr-count'},{s:'device-ieeeadr-list', d:'Info/permit-tag-list',tr:arrayToString}], 
                        fun: procGWRsp
                    },                      

                    { 
                        type_id:'2-262', dev: GS_DEVTYPE_GW, name:'get-permit-tag-list', uid: '', action_type:'get',
                        param:[{}], 
                        fun: getCmd
                    },   // <Not Test>             
                    { 
                        type_id:'3-262', dev: GS_DEVTYPE_GW, name:'get-permit-tag-list-rsp', uid: '', action_type:'rsp',
                        param:[{s:'device-ieeeadr-index'},{s:'device-ieeeadr-count'},{s:'device-ieeeadr-list',d:'Info/permit-tag-list',tr:arrayToString}], 
                        fun: procGWRsp
                    },    //  <Not Test>

                    { 
                        type_id:'2-263', dev: GS_DEVTYPE_GW, name:'gateway-zd-setup-channel', uid: '', action_type:'set', uri_path:'ESL-GW/Info/channel',
                        param:[{s:'channel'}], 
                        fun: setCmd
                    }, 

                    { 
                        type_id:'3-263', dev: GS_DEVTYPE_GW, name:'gateway-zd-setup-channel-rsp', uid: '', action_type:'rsp', uri_path:'ESL-GW/Info/channel', sync: 1,
                        param:[{s:'channel', d:'Info/channel'}], 
                        fun: procGWRsp
                    },                       

                    { 
                        type_id:'2-264', dev: GS_DEVTYPE_GW, name:'gateway-zd-reboot', uid: '', action_type:'set', uri_path:'ESL-GW/Info/reboot',
                        param:[], 
                        fun: setCmd
                    },   // Tested
                    { 
                        type_id:'3-264', dev: GS_DEVTYPE_GW, name:'gateway-zd-reboot-rsp', uid: '', action_type:'rsp',
                        param:[], // not to update value only reply ok or fail
                        fun: procGWRsp
                    },   // Tested

                    { 
                        type_id:'2-265', dev: GS_DEVTYPE_GW, name:'zd-get-router-list', uid: '', action_type:'get',
                        param:[{}], 
                        fun: getCmd
                    },   // Tested                
                    { 
                        type_id:'3-265', dev: GS_DEVTYPE_GW, name:'zd-get-router-list-rsp', uid: '', action_type:'rsp',
                        param:[{s:'device-ieeeadr-count', d:'Info/device-number'},{s:'device-ieeeadr-list',d:'Info/DeviceList',tr:routerListMACtoAgentId}], 
                        fun: procGWRsp
                    },   // Tested

                    {                      
                        type_id:'2-266', dev: GS_DEVTYPE_GW, name:'gw-zd-fw-update', uid: '', action_type:'set', uri_path:'zd-fw-update',
                        param:[{s:'fw-name',d:'fw-name'},{s:'fw-version',d:'fw-version'},{s:'fw-crc',d:'fw-crc'}], 
                        fun: setCmd
                    },   // Tested

                    {                      
                        type_id:'3-266', dev: GS_DEVTYPE_GW, name:'gw-zd-fw-update-rsp', uid: '', action_type:'rsp', uri_path:'zd-fw-update',
                        param:[], 
                        fun: procGWRsp
                    },   // <NOT>                    


                    { 
                        type_id:'2-274', dev: GS_DEVTYPE_GW, name:'replace-permit-tag-list', uid: '', action_type:'set', uri_path: 'ESL-GW/Info/permit-tag-list',
                        param:[{s:'device-ieeeadr-list',tr:stringToArray}], 
                        fun: setCmd
                    }, 
                    
                    { 
                        type_id:'3-274', dev: GS_DEVTYPE_GW, name:'replace-permit-tag-list-rsp', uid: '', action_type:'rsp',
                        param:[{s:'device-ieeeadr-count'},{s:'device-ieeeadr-list',d:'Info/permit-tag-list',tr:arrayToString}], 
                        fun: procGWRsp
                    },                      
                                        

                    
                    //====================== < Router >  =======================================

                    // ----- 0200+2 router-re-register ----------------------------------------------------------------------------------
                    { 
                        type_id:'2-514', dev: GS_DEVTYPE_ROUTER, name:'router-re-register', uid:'' , action_type:'set', uri_path: '',
                        param:[{s:'router-addr'}], 
                        fun: setCmd
                    },  

                    // ----- 0200+4 zd-setup-channel ----------------------------------------------------------------------------------
                    { 
                        type_id:'2-516', dev: GS_DEVTYPE_ROUTER, name:'router-zd-setup-channel', uid:'' , action_type:'set', uri_path: 'ESL-Router/Info/channel',
                        param:[{s:'router-addr'},{s:'channel'}], 
                        fun: setCmd
                    },   
                    
                    { 
                        type_id:'3-516', dev: GS_DEVTYPE_ROUTER, name:'router-zd-setup-channel-rsp', uid:'router-addr' , action_type:'rsp', sync: 1,
                        param:[{s:'router-addr'},{s:'channel',d:'Info/channel'}], 
                        fun: procRouterRsp
                    },                      

                    
                    // ----- 0200+5 router-zd-reboot ----------------------------------------------------------------------------------
                    { 
                        type_id:'2-517', dev: GS_DEVTYPE_ROUTER, name:'router-zd-reboot', uid:'' , action_type:'set', uri_path: 'ESL-Router/Info/reboot',
                        param:[{s:'router-addr'}], 
                        fun: setCmd
                    },  // Not
                    { 
                        type_id:'3-517', dev: GS_DEVTYPE_ROUTER, name:'router-zd-reboot-rsp', uid:'router-addr' , action_type:'rsp', 
                        param:[{s:'router-addr'}], 
                        fun: procRouterRsp
                    },  // Not

                    // ---- 0200+6 get-tag-list ---------------------------------------------------------------------------------------
                    { 
                        type_id:'2-518', dev: GS_DEVTYPE_ROUTER, name:'get-tag-list', uid: '', action_type:'get',
                        param:[{s:'router-addr'}], 
                        fun: getCmd
                    }, // Tested  
                    { 
                        type_id:'3-518', dev: GS_DEVTYPE_ROUTER, name:'get-tag-list-rsp', uid: 'router-addr', action_type:'rsp',
                        param:[{s:'device-ieeeadr-index'},{s:'device-ieeeadr-count', d:'Info/device-number'},{s:'device-ieeeadr-list',d:'Info/DeviceList',tr:arrayToString}], 
                        fun: procRouterRsp
                    }, // Tested  


                    // ----- 0200+7 zd-fw-update-t ----------------------------------------------------------------------------------
                    { 
                        type_id:'2-519', dev: GS_DEVTYPE_ROUTER, name:'zd-fw-update-t', uid: '', action_type:'set',
                        param:[{s:'router-addr'},{s:'fw-name'},{s:'fw-version'},{s:'fw-crc'}], 
                        fun: setCmd
                    },  
                    { 
                        type_id:'3-519', dev: GS_DEVTYPE_ROUTER, name:'zd-fw-update-t-rsp', uid: 'router-addr', action_type:'rsp', sync: 1,
                        param:[{s:'router-addr'}], 
                        fun: procRouterRsp
                    },  
                    // ----- 0200+8 zd-fw-update-r ----------------------------------------------------------------------------------
                    { 
                        type_id:'2-520', dev: GS_DEVTYPE_ROUTER, name:'zd-fw-update-r', uid: '', action_type:'set',
                        param:[{s:'router-addr'},{s:'fw-name'},{s:'fw-version'},{s:'fw-crc'}], 
                        fun: setCmd
                    },  
                    { 
                        type_id:'3-520', dev: GS_DEVTYPE_ROUTER, name:'zd-fw-update-r-rsp', uid: 'router-addr', action_type:'rsp',
                        param:[{s:'router-addr'}], 
                        fun: procRouterRsp
                    },  

                    // ---- 0200+10 set-zd-tx-power-r ---------------------------------------------------------------------------------------
                    { 
                        type_id:'2-522', dev: GS_DEVTYPE_ROUTER, name:'set-zd-tx-power-r', uid: '', action_type:'set', uri_path: 'ESL-Router/Info/tx-level-r',
                        param:[{s:'router-addr'},{s:'tx-level'}], 
                        fun: setCmd // reply
                    }, 
                    { 
                        type_id:'3-522', dev: GS_DEVTYPE_ROUTER, name:'set-zd-tx-power-r-rsp', uid: 'router-addr', action_type:'rsp', sync: 1,
                        param:[{s:'router-addr'},{s:'tx-level',d:'Info/tx-level-r'}], 
                        fun: procRouterRsp
                    },     

                    // -----0200+11 get-zd-tx-power-r -------------------------------------------------------------------------------------                    
                    { 
                        type_id:'2-523', dev: GS_DEVTYPE_ROUTER, name:'get-zd-tx-power-r', uid: '', action_type:'get',
                        param:[{s:'router-addr'}], 
                        fun: getCmd
                    }, // Tested             
                    { 
                        type_id:'3-523', dev: GS_DEVTYPE_ROUTER, name:'get-zd-tx-power-r-rsp', uid: 'router-addr', action_type:'rsp',
                        param:[{s:'router-addr'},{s:'tx-level',d:'Info/tx-level-r'}], 
                        fun: procRouterRsp
                    }, // Tested   

                    // -----0200+12 set-zd-tx-power-t -------------------------------------------------------------------------------------
                    { 
                        type_id:'2-524', dev: GS_DEVTYPE_ROUTER, name:'set-zd-tx-power-t', uid: '', action_type:'set', uri_path: 'ESL-Router/Info/tx-level-t',
                        param:[{s:'router-addr'},{s:'tx-level'}], 
                        fun: setCmd  // reply
                    }, 
                    { 
                        type_id:'3-524', dev: GS_DEVTYPE_ROUTER, name:'set-zd-tx-power-t-rsp', uid: 'router-addr', action_type:'rsp', sync:1, 
                        param:[{s:'router-addr'},{s:'tx-level',d:'Info/tx-level-t'}], 
                        fun: procRouterRsp
                    }, 
                    
                    // -----0200+13 get-zd-tx-power-t -------------------------------------------------------------------------------------                    
                    { 
                        type_id:'2-525', dev: GS_DEVTYPE_ROUTER, name:'get-zd-tx-power-t', uid: '', action_type:'get',
                        param:[{s:'router-addr'}], 
                        fun: getCmd
                    }, // Tested             
                    { 
                        type_id:'3-525', dev: GS_DEVTYPE_ROUTER, name:'get-zd-tx-power-t-rsp', uid: 'router-addr', action_type:'rsp',
                        param:[{s:'router-addr'},{s:'tx-level',d:'Info/tx-level-t'}], 
                        fun: procRouterRsp
                    }, // Tested                     
                    


                    //================================= < Tag >  =======================================                    

                    // ----- 0x300+2 tag-re-register -------------------------------------------------------------------------------------
                    {   
                        type_id:'2-770', dev: GS_DEVTYPE_TAG, name:'tag-re-register', uid: '', action_type:'set', uri_path:'',
                        param:[{s:'tag-addr'}], 
                        fun: setCmd
                    },  
                    
                    // -----  0x300+3 set-timeout-setting  (for disconnect) -------------------------------------------------------------------------------------
                    {   
                        type_id:'2-771', dev: GS_DEVTYPE_TAG, name:'set-timeout-setting', uid: '', action_type:'set', uri_path: 'ESL-Tag/Info/timeout',
                        param:[{s:'tag-addr'},{s:'timeout'}], 
                        fun: setCmd
                    }, // Reply  

                    {   
                        type_id:'3-771', dev: GS_DEVTYPE_TAG, name:'set-timeout-setting-rsp', uid: 'tag-addr', action_type:'rsp', sync:1,
                        param:[{s:'tag-addr'},{s:'timeout', d:'Info/timeout'}], // should update timeout 
                        fun: procTagRsp
                    }, // Not      

                    // ----- get-timeout-setting -------------------------------------------------------------------------------------
                    {   
                        type_id:'2-772', dev: GS_DEVTYPE_TAG, name:'get-timeout-setting', uid: '', action_type:'get',
                        param:[{s:'tag-addr'}], 
                        fun: getCmd
                    }, // Not             
                    {   
                        type_id:'3-772', dev: GS_DEVTYPE_TAG, name:'get-timeout-setting-rsp', uid: 'tag-addr', action_type:'rsp',
                        param:[{s:'tag-addr'},{s:'timeout',d:'Info/timeout'}],
                        fun: procTagRsp
                    }, // Not     

                    // 773 led-control
                    
                    // ------ 0x300+6 set-command-timeout-setting xxxxxxxxxxxxxxxxxxxx NOT use
                    {   
                        type_id:'2-774', dev: GS_DEVTYPE_TAG, name:'set-command-timeout-setting', uid: '', action_type:'set', uri_path: '',
                        param:[{s:'tag-addr'},{s:'cmd-id'},{s:'timeout'}], 
                        fun: setCmd
                    }, // Reply   
                    {   
                        type_id:'3-774', dev: GS_DEVTYPE_TAG, name:'set-command-timeout-setting-rsp', uid: 'tag-addr', action_type:'rsp', uri_path: '',
                        param:[{s:'tag-addr'},{s:'cmd-id'},{s:'timeout'}], 
                        fun: setCmd
                    }, // Reply                                         

                    // 4-774 broadcast-set-command-timeout-setting
                    {   
                        type_id:'4-774', dev: GS_DEVTYPE_TAG, name:'broadcast--set-command-timeout-setting', uid: '', action_type:'set', uri_path: '',
                        param:[{s:'cmd-id'},{s:'timeout'}], 
                        fun: setCmd
                    }, // Not     


                    // -----0x300+7 image-update ------------------------------------------------------------------------------------
                    {   
                        type_id:'2-775', dev: GS_DEVTYPE_TAG, name:'image-update', uid: '', action_type:'set', uri_path: 'ESL-Tag/Action/image-update', extra: 1,
                        param:[{s:'tag-addr'},{s:'image-name'},{s:'image-crc'}], 
                        fun: procImageUpdate
                    }, // OK             
                    {   
                        type_id:'3-775', dev: GS_DEVTYPE_TAG, name:'image-update-rsp', uid: 'tag-addr', action_type:'rsp',
                        param:[{s:'tag-addr'},{s:'image-name'},{s:'image-crc'}],
                        fun: procTagRsp
                    }, // OK   

                    {   
                        type_id:'4-775', dev: GS_DEVTYPE_TAG, name:'broadcast-image-update', uid: '', action_type:'set', uri_path: '', extra: 1,
                        param:[{s:'image-name'},{s:'image-crc'}], // GW fun
                        fun: procImageUpdate
                    }, // XXX             
  
                    // 300 + 8 776 -> get-image-stack
                    
                    // ----- 300 + 9 refresh-image ------------------------------------------------------------------------------------                    
                    {   
                        type_id:'2-777', dev: GS_DEVTYPE_TAG, name:'refresh-image', uid: '', action_type:'set', uri_path:'ESL-Tag/Action/refresh-image',
                        param:[{s:'tag-addr'},{s:'timedelay',v:0}], 
                        fun: setCmd
                    }, // Not             
                    {   
                        type_id:'3-777', dev: GS_DEVTYPE_TAG, name:'refresh-image-rsp', uid: 'tag-addr', action_type:'rsp',
                        param:[{s:'tag-addr'}],
                        fun: procTagRsp
                    }, // Not  
                    {   
                        type_id:'4-777', dev: GS_DEVTYPE_TAG, name:'broadcast-refresh-image', uid: '', action_type:'set', uri_path:'ESL-Tag/Action/broadcast-refresh-image',
                        param:[{s:'image-crc'},{s:'timedelay',v:0}],  // ??? GW fun multi-crc
                        fun: setCmd
                    }, // Not                      
                    
                    
                    // ----- 300 + 10 zd-fw-update ------------------------------------------------------------------------------------
                    {   
                        type_id:'2-778', dev: GS_DEVTYPE_TAG, name:'tag-zd-fw-update', uid: '', action_type:'set', uri_path:'fwupdate',
                        param:[{s:'tag-addr'},{s:'fw-name'},{s:'fw-version'},{s:'fw-crc'}], 
                        fun: setCmd
                    }, // Not             
                    {   
                        type_id:'3-778', dev: GS_DEVTYPE_TAG, name:'tag-zd-fw-update-rsp', uid: 'tag-addr', action_type:'rsp',  // ??? NO RSP
                        param:[{s:'tag-addr'}],
                        fun: procTagRsp
                    }, // Not                      

                    // ----- 0x300+11 zd-reboot ------------------------------------------------------------------------------------
                    {   
                        type_id:'2-779', dev: GS_DEVTYPE_TAG, name:'zd-reboot', uid: '', action_type:'set', uri_path:'ESL-Tag/Action/reboot',
                        param:[{s:'tag-addr'}], 
                        fun: setCmd
                    }, // Reply             
                    {   
                        type_id:'3-779', dev: GS_DEVTYPE_TAG, name:'zd-reboot-rsp', uid: 'tag-addr', action_type:'rsp', 
                        param:[{s:'tag-addr'}],
                        fun: procTagRsp
                    }, // Not       
                    
                    // ----- 0x300+12 zd-reset-to-default ------------------------------------------------------------------------------------
                    {   
                        type_id:'2-780', dev: GS_DEVTYPE_TAG, name:'zd-reset-to-default', uid: 'tag-addr', action_type:'set', uri_path:'ESL-Tag/Action/reset-to-default',
                        param:[{s:'tag-addr'}], 
                        fun: setCmd
                    }, // Reply             
                    {   
                        type_id:'3-780', dev: GS_DEVTYPE_TAG, name:'zd-reset-to-default', uid: 'tag-addr', action_type:'rsp', // ??? NO RSP
                        param:[{s:'tag-addr'}],
                        fun: procTagRsp 
                    }, // Not               
                    
  
                    // ----- x0300+16 set-state-report-period -------------------------------------------------------------------------------------
                    {   
                        type_id:'2-781', dev: GS_DEVTYPE_TAG, name:'set-state-report-period', uid: 'tag-addr', action_type:'set', uri_path:'ESL-Tag/Info/state-report-period',
                        param:[{s:'tag-addr'},{s:'state-report-period', d:'Info/state-report-period'}], 
                        fun: setCmd
                    }, // Reply                
                    {   
                        type_id:'3-781', dev: GS_DEVTYPE_TAG, name:'set-state-report-period-rsp', uid: 'tag-addr', action_type:'rsp', sync: 1,
                        param:[{s:'tag-addr'},{s:'state-report-period',d:'Info/state-report-period'}],          
                        fun: procTagRsp
                    },     
                    
                    
                    {   
                        type_id:'4-781', dev: GS_DEVTYPE_TAG, name:'broadcast-set-state-report-period-rsp', uid: 'router-addr', action_type:'set', uri_path:'',
                        param:[{s:'state-report-period',d:'Info/state-report-period'}], // GW fun
                        fun: procTagRsp
                    },                      

                    // ----- x0300+14 set-data-request-period -------------------------------------------------------------------------------------
                    {   
                        type_id:'2-782', dev: GS_DEVTYPE_TAG, name:'set-data-request-period', uid: '', action_type:'set', uri_path:'ESL-Tag/Info/data-request-period',
                        param:[{s:'tag-addr'},{s:'data-request-period',d:'data-request-period'}], 
                        fun: setCmd
                    }, // Reply                
                    {   
                        type_id:'3-782', dev: GS_DEVTYPE_TAG, name:'set-data-request-period-rsp', uid: 'tag-addr', action_type:'rsp', sync: 1,
                        param:[{s:'tag-addr'},{s:'data-request-period',d:'Info/data-request-period'}],                     
                        fun: procTagRsp                
                    },
                    {   
                        type_id:'4-782', dev: GS_DEVTYPE_TAG, name:'broadcast-set-data-request-period', uid: '', action_type:'set', uri_path:'',
                        param:[{s:'data-request-period',d:'data-request-period'}], // GW fun
                        fun: setCmd
                    },                      

                 
                    
                    
                    // ================================= < ESL >  =======================================    
                    // Prefix  of ESL RESTful: /ESL/GW
                    // Method: GET / PUT
                    // GW:     /ESL/GW/<Dev>/CMD
                    // Router: /ESL/Router/<Dev>/CMD
                    // Tag:    /ESL/Tag/<Dev>/CMD
                    // ===================================================================================

                    // ================================= FW update ======================================

                    // ----- GW zd-fw-update -----------------------------------------------------------------------------------------------
                    // URI:  restapi/WSNManage/ESL/GW/All/zd-fw-update
                    // Data: {"zd-fw-name":"gw-zd-v1","zd-fw-version":2,"zd-fw-crc":"f6d8"}
                    {   
                        type_id:'x-xxx', dev: GS_DEVTYPE_GW, name:'esl-gw-zd-fw-update', uid: '', action_type:'set', uri_path:'GW/All/zd-fw-update',
                        param:[{s:'zd-fw-name'},{s:'zd-fw-version'},{s:'zd-fw-crc'}],
                        fun: setESLGWUpdateFW
                    },                      


                    // ----- All Router zd-fw-update -----------------------------------------------------------------------------------------------
                    // URI:  restapi/WSNManage/ESL/Router/<DevId>/zd-fw-update
                    // Data: {"zd-t-fw-name":"router-zd-t-v1","zd-t-fw-version":1,"zd-t-fw-crc":"ff63", "zd-r-fw-name":"router-zd-r-v1","zd-r-fw-version":1,"zd-r-fw-crc":"ff63"}
                    {   
                        type_id:'x-xxx', dev: GS_DEVTYPE_ALL_ROUTER, name:'esl-all-router-zd-fw-update', uid: '', action_type:'set', uri_path:'Router/All/zd-fw-update',
                        param:[{s:'zd-t-fw-name'},{s:'zd-t-fw-version'},{s:'zd-t-fw-crc'},{s:'zd-r-fw-name'},{s:'zd-r-fw-version'},{s:'zd-r-fw-crc'}],
                        fun: setESLRouterUpdateFW
                    }, 
                    

                    // ----- All Tag zd-fw-update -----------------------------------------------------------------------------------------------
                    // URI:  restapi/WSNManage/ESL/Tag/<DevId>/zd-fw-update
                    // Data: {"zd-t-fw-name":"router-zd-t-v1","zd-t-fw-version":1,"zd-t-fw-crc":"ff63", "zd-r-fw-name":"router-zd-r-v1","zd-r-fw-version":1,"zd-r-fw-crc":"ff63"}
                    {   
                        type_id:'x-xxx', dev: GS_DEVTYPE_ALL_TAG, name:'esl-all-tag-zd-fw-update', uid: '', action_type:'set', uri_path:'Tag/All/zd-fw-update',
                        param:[{s:'zd-fw-name'},{s:'zd-fw-version'},{s:'zd-fw-crc'}],
                        fun: setESLTagUpdateFW
                    },    
                    
                    // ================================= ESL Management ======================================
                    // URI:  restapi/WSNManage/ESL/GW/All/DevInfo
                    {   
                        type_id:'x-xxx', dev: GS_DEVTYPE_GW, name:'esl-gw-DevInfo', uid: '', action_type:'get', uri_path:'GW/All/DevInfo', 
                        param:[{s:'zd-fw-name'}],
                        fun: getESLGWInfo
                    }, 
                    
                    // URI:  restapi/WSNManage/ESL/Router/All/DevInfo
                    {   
                        type_id:'x-xxx', dev: GS_DEVTYPE_ALL_ROUTER, name:'esl-all-router-DevInfo', uid: '', action_type:'get', uri_path:'Router/All/DevInfo',
                        param:[],
                        fun: getESLRouterInfo 
                    }, 
                    
                    // URI:  restapi/WSNManage/ESL/Router/<DevID>/TagInfo
                    {   
                        type_id:'x-xxx', dev: GS_DEVTYPE_ROUTER, name:'esl-all-tag-by-router-DevInfo', uid: '', action_type:'get', uri_path:'Router/+/TagInfo',
                        param:[],
                        fun: getESLTagInfo
                    },                     

    ]
}


var InitModule = function()
{
    // Load Protocol, Params, and Fun Map
    for(var i=0; i< GS_CMDID.GS_PROTOCOL.length; i++ ) {
        gIdfnMap.set(GS_CMDID.GS_PROTOCOL[i].type_id, GS_CMDID.GS_PROTOCOL[i] ); 
    }

    for( var i=0; i< GS_CMDID.GS_PROTOCOL.length; i++ ) {
        gNamfnMap.set( GS_CMDID.GS_PROTOCOL[i].name, GS_CMDID.GS_PROTOCOL[i] );
    }

    for( var i=0; i< GS_CMDID.GS_PROTOCOL.length; i++ ) {
        if( typeof GS_CMDID.GS_PROTOCOL[i].uri_path !== 'undfined' ) {
            gUrinMap.set( GS_CMDID.GS_PROTOCOL[i].uri_path, GS_CMDID.GS_PROTOCOL[i]);
        }
    }
}




var Dispatch = function(topic,message) {
    var key = '';
    
    try {
        var re = /\0/g;
        msg = message.toString().replace(re, '');
        var jsonObj = JSON.parse(msg);
    } catch (e) {
        console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        console.error(e);
        return;
    }    

    //console.log('[debug all mqtt data] ' + msg );
    key = jsonObj['Cmd-Type'] + '-' + jsonObj['Cmd-Id'];

    if( jsonObj['Cmd-Type']  == 2 /* ingore send cmd */) return;

    if( gIdfnMap.has(key) == true ) {
        var protMap = gIdfnMap.get(key);
        protMap.fun(topic,jsonObj,protMap);
    }

    
}


var mqttConnectCallback =  function () {
    //console.log('[esl_mgr] Mqtt connected !!!!');
 
    Client.subscribe(GS_MQTT_SUB);      
    Client.subscribe(GS_MQTT_PUB);
}

  var mqttDisconnectCallback = function() {
	console.log('[esl_mgr] Mqtt disconnected !!!');

	//removeAllVGW();
}

var mqttMessageCallback = function (topic, message){
    // message is Buffer 
    
    Dispatch(topic, message);
}
  

// <2>  ============== <RESTful> ==============
var getUriType = function ( uri )
{   
    var uriList = uri.split('/');
    var category = uriList[0];

    if ( category === 'SenHub' )
    return URI_TYPE.SENSORHUB ;
    else if ( category === 'Connectivity' )
    return URI_TYPE.CONNECTIVITY ;
    else if ( category === 'ESL' )
    return URI_TYPE.ESL;      
    
    return URI_TYPE.UNKNOW;
}

// Input: data: {"e":[{"n":"123","sv":"123"},{"n":"456"}]}
//        name: 123
//
// Output: Not Found: 'undefined'
//             Found: [{"n":"123","sv":"123"}
var findResourcebyName = function( srcObj, name )
{
    //console.log('src len'+ srcObj['e'].length);
    for( var i=0; i < srcObj['e'].length; i++ )
    {
        //console.log('name '+ srcObj['e'][i]['n']);
        if( name === srcObj['e'][i]['n'] )
            return srcObj['e'][i];
    }
}



var restfulIoTGW = function ( path, devObj )
{
    console.log('URI '+ JSON.stringify(path));       
    var iotgw = JSON.parse(JSON.stringify(IOT_GW));         
    var pathArray = path.split('/');
    var tmp = 'undefined';


    if( typeof devObj === 'undefined' ) return tmp;
    
    tmp = genFullIoTGWData( devObj );

    if(  path === '' || path === '/' )
        return tmp; 
    else 
    {
        for ( var i=0; i<pathArray.length; i++) { 
            console.log('rule '+ i + pathArray[i] + ' len '+pathArray.length);
            if(pathArray[i] != '')
            {
                if( pathArray[i] == 'Info' && ( i+1 === pathArray.length-1 ) && pathArray[i+1] != '' && pathArray[i+1] !== 'e' )  // Info/DeviceList => to find 'n'
                {
                        tmp = findResourcebyName(tmp[pathArray[i]],pathArray[i+1]);   
                        break;
                }
                tmp = tmp[pathArray[i]];
                if( typeof tmp == 'undefined') break;
                console.log('ret= '+ JSON.stringify(tmp));
            }
        }        
    }
    return tmp;
}


var  getConnectivityRESTful = function( uri, outObj )
{    
    var path = uri.replace(/^Connectivity/g,'');
    var tmpValue;
    var capability;
    var jsonData;
    var keyStr;
    var gwObj = 'undefined'; 
    var ret = STATUS.NOT_FOUND;

    gwObj = gGwMap.get(gGwUid);

    if( typeof gwObj === 'undefined')  {
        outObj.ret = JSON.stringify(IOT_GW);
        ret = STATUS.OK;
    } else {
        outObj.ret = JSON.stringify(restfulIoTGW( path, gwObj ));
        if( typeof outObj.ret != 'undefined' )
            ret = STATUS.OK;
    }

    //console.log('[getConnectivityRESTful] result ' + outObj.ret );
    return ret;    
}



// Input: path: SenHub/SenData/image-crc/, devObj
// Output: {"n":"image-crc","sv":"ff10","asm":"r"}
var restfulSenHub = function( path , devObj )
{
    //console.log('restfulSenHub '+ JSON.stringify(path));       
    var iotgw = JSON.parse(JSON.stringify(IOT_GW));         
    var pathArray = path.split('/');
    var tmp = 'undefined';


    if( typeof devObj === 'undefined' ) return tmp;
    
    tmp = genFullSenHubData( devObj );

    if(  path === '' || path === '/' )
        return tmp; 
    else 
    {
        for ( var i=0; i<pathArray.length; i++) 
        { 
            console.log('rule '+ i + pathArray[i] + ' len '+pathArray.length);
            if(pathArray[i] != '')
            {                
                if( ( pathArray[i] == 'Info' || pathArray[i] == 'SenData' || pathArray[i] == 'Net' || pathArray[i] == 'Action' ) && 
                    ( i+1 === pathArray.length-1 ) && pathArray[i+1] != '' && pathArray[i+1] !== 'e' )  // Info/DeviceList => to find 'n'
                {
                        tmp = findResourcebyName(tmp[pathArray[i]],pathArray[i+1]);
                        break;
                }
                tmp = tmp[pathArray[i]];
                if( typeof tmp == 'undefined') break;
                //console.log('ret= '+ JSON.stringify(tmp));
            }
        }        
    }
    return tmp;
}

//Input  uri                             Output
//  0: SenHub/AllSenHubList          {"n":"AllSenHubList","sv":"0120001077a15000"}  
//  1: SenHub/<AgentID>/DeviceInfo   {"devID":"0120001077a15000","hostname":"WISE-1100-5000","sn":"0120001077a15000",...}
//  2. SenHub/<AgentID>/SenHub/...   {"SenHub":{"SenData":{"e":[{"n":"image-crc","sv":"ff10","asm":"r"},...}
var getSensorHubRESTful = function( uri, outObj )
{    
    var path = uri.replace(/\/$/g,'');
    var pathArray = path.split('/');
    var agentID = pathArray[1];
  
    //console.log('[getSensorHubRESTful] path = ' + path + ', pathArray length = ' + pathArray.length);
    var regexAllSenHubList = new RegExp('\/AllSenHubList\/?$');
    var regexDevInfo = new RegExp('\/DevInfo\/?$');

    var ret = STATUS.NOT_FOUND;
    
    // SenHub/AllSenHubList 
    if ( pathArray.length === 2 && regexAllSenHubList.test(path) )
    {    
        console.log('AllSenHubList ===============');
        var sensorHubAllListObj = {};
        sensorHubAllListObj.n = 'AllSenHubList';
        sensorHubAllListObj.sv = '';
    
        var sensorHubAllList = '';
        gDevIDMap.forEach(function(obj, key) {
        if ( sensorHubAllList.length !== 0){
            sensorHubAllList += ',';
            }
            sensorHubAllList += key;
        });
        sensorHubAllListObj.sv = sensorHubAllList;
        outObj.ret = JSON.stringify(sensorHubAllListObj);
        ret = STATUS.OK;
    } 
    else if ( pathArray.length === 3 && regexDevInfo.test(path) ) // DeviceInfo
    {              
        console.log('SenHub/<deviceID>/DevInfo  ===============');
        var devObj = getDevObjbyAgentId( agentID );
        if( typeof devObj !== 'undefined') 
        {
            outObj.ret = JSON.stringify(devObj.devinfo);
            ret = STATUS.OK;
        }
    }    
    else if ( pathArray.length >= 2 ) // SenHub/<agentID>  Capability / Data
    {   
        console.log('SenHub/<agentID> ===============');
        var devObj = getDevObjbyAgentId( agentID );

        if( devObj !== 'undefined')         
        {
            var uri = '';
            for ( var i = 2; i< pathArray.length +1; i ++ ) { 
                if( typeof pathArray[i] != 'undefined')               
                    uri += '/' + pathArray[i];
            }

            if( devObj.typeinfo.devType === GS_DEVTYPE_ROUTER )
            {
                outObj.ret = JSON.stringify(restfulIoTGW( uri , devObj ));
                outObj.type = ESL_ROUTER_NAME;
            }
            else if ( devObj.typeinfo.devType === GS_DEVTYPE_TAG )
            {
                outObj.ret = JSON.stringify(restfulSenHub( uri , devObj ));
                outObj.type = ESL_TAG_NAME;
            }

            if( typeof outObj.ret !== 'undefined')
                ret = STATUS.OK;
        }
    }

    //console.log('[getConnectivityRESTful] result ' + outObj.ret );
    return ret;     
}





//        0     1     2     3
// Basic Device Info
// uri: /ESL/GW/All/DevInfo
// uri: /ESL/Router/All/DevInfo
// uri: /ESL/Router/<DevID>/TagInfo
// 
var getESLRESTful = function( uri, outObj )
{
    // To find uri_path
    var ret = STATUS.NOT_FOUND;    
    // To find uri_path
    var uriList = uri.split('/');    
    
    console.log('uri= '+uri);

    if(uriList.length < 4 ) {
        return;
    }

    var type    = uriList[1]; // Router or Tag
    var agentId = uriList[2]; // All or DevID
    var entry   = uriList[3]; // command entry
    var key     = '';
    var params = {};    
    
    console.log('type '+ type + ' agentID '+agentId +' entry '+ entry);

    if( agentId.length > 10 )
        key = type + '/+/' + entry;
    else
        key = type + '/' +agentId + '/' + entry;

    if( !( agentId !== 'All' || gDevIDMap.has(agentId)  == false ) ) // Not Found
        return;


    console.log('key= '+ key);


    var actionMap = gUrinMap.get(key); 
    
    if( typeof actionMap == 'undefined') // Not Found
        return;

    if( actionMap.action_type !== 'get' ) // Not Found
        return; 
        
    console.log(JSON.stringify(actionMap));
    params.uri = uri;
    params.outObj = outObj; 

    return actionMap.fun( actionMap, params );  
}

// Description: process RESTful 'GET' Request
var wsnget = function( uri, inParam, outData ) 
{
    console.log('usnget uri = ' + uri);
    var uriType = getUriType ( uri );
    var code = STATUS.NOT_FOUND;

    switch( uriType )
    {
      case URI_TYPE.CONNECTIVITY:
      {        
        //console.log('URI_TYPE.CONNECTIVITY ===============');          
        getConnectivityRESTful(uri, outData);
        break;
      }
      case URI_TYPE.SENSORHUB:
      {
        //console.log('URI_TYPE.SENSORHUB ===============');
        getSensorHubRESTful( uri, outData );
        break;
      }
      case URI_TYPE.ESL:
      {
        console.log('URI_TYPE.ESL ===============');
        getESLRESTful( uri, outData );
      }
      break;
      default:
      {
        console.log('UnKnow URI ===============');
        break;
      }
    }
         
    
    if ( typeof outData.ret !== 'undefined' )
    {
        console.log('-----------------------------------------');
        console.log(outData.ret);
        console.log('-----------------------------------------');         
        outData.ret = outData.ret.toString();
        code = STATUS.OK;
    }
  
    return code;
}



// type: URI_TYPE.CONNECTIVITY ; URI_TYPE.SENSORHUB
// uri: /SenHub/00124b00043a9766/SenHub/Action/reboot
// data: v, bv, sv
var procSetRestful = function( type, devType, uri, data, res, cb )  // res: http response handler, data cb: callback function
{
    // To find uri_path
    var uriList = uri.split('/');
    var agentID = uriList[1];
    var params = {};    

    var key = devType + '/' + uriList[uriList.length-2] +'/' + uriList[uriList.length-1];


    // tx-level
     var value = 'undefined'; 

    if( gUrinMap.has(key) == true ) 
    {
        var actionMap = gUrinMap.get(key);

        if( type === URI_TYPE.SENSORHUB )
        {
            if ( gDevIDMap.has(agentID) === true )
            {
                sensorHub = gDevIDMap.get(agentID);
                if( typeof sensorHub !== 'undefined' )   
                    params['devId'] = sensorHub.uid;
            }
        }
        params.cb  = cb;       
        params.res = res;

        if( typeof actionMap.extra !== 'undefined' ) // for image / fw update
        {
            params.data = data; 
            console.log('[special process] ' + actionMap.name );
        }
        else
        {      
            console.log('set data ' + data);
            value = getValue( data );

            if( typeof value !== 'undefined' && actionMap.param.length > 0 ) // tr
            {
                for( var i=0; i< actionMap.param.length; i++ )
                {
                    var s  = actionMap.param[i]['s'];
                    var tr = actionMap.param[i]['tr'];
                    var defvalue = actionMap.param[i]['v'];
                    if( s !== 'router-addr' &&  s !== 'tag-addr' )
                    {
                        if( typeof defvalue != 'undefined') // refresh-image- timedelay (0)
                            params[s] = defvalue;
                        else if( typeof tr == 'undefined' ) 
                            params[s] = value;
                        else 
                            params[s] = tr(value);                    
                    }
                }
            }
        }
        actionMap.fun( actionMap, params );       
    }        
}


//        0     1     2     3
// uri: /ESL/Router/All/zd-fw-update
// 
var procSetESLRESTful = function( uri, data, res, cb )
{
    // To find uri_path
    var uriList = uri.split('/');    

    console.log('uri= '+uri);

    if(uriList.length < 4 ) {
        cb(res, STATUS.NOT_FOUND, '{"sv":"Not Found"}');
        return;
    }

    var type    = uriList[1]; // Router or Tag
    var agentId = uriList[2]; // All or DevID
    var entry   = uriList[3]; // command entry
    var key     = '';
    var params = {};    
    
    console.log('type '+ type + ' agentID '+agentId +' entry '+ entry);

    if( agentId.length > 10 )
        key = type + '/+/' + entry;
    else
        key = type + '/' + agentId + '/' + entry;

    if(  !( agentId !== 'All' || gDevIDMap.has(agentId)  == false  ) )
    {
        cb(res, STATUS.NOT_FOUND, '{"sv":"Not Found"}');
        return;
    }


    var actionMap = gUrinMap.get(key);

    if( typeof actionMap == 'undefined')
    {
        cb(res, STATUS.NOT_FOUND, '{"sv":"Not Found"}');
        return;
    }

    if( actionMap.action_type !== 'set' )
    {
        cb(res, STATUS.FORBIDDEN, '{"sv":"Read Only"}');
        return;      
    }

    params.uri = uri;
    params.cb  = cb;       
    params.res = res;    
    params.data = data;

    actionMap.fun( actionMap, params );  
  
}


// Description: process RESTful 'PUT' Request 
var wsnput = function( uri, data, res, callback ) {
    cb = callback;
    console.log('wsnput uri = ' + uri);
    var uriType = getUriType ( uri );
    var outData = {};
    var code = STATUS.NOT_FOUND;

    switch( uriType )
    {
      case URI_TYPE.CONNECTIVITY:
      {        
        //console.log('URI_TYPE.CONNECTIVITY ===============');          
        getConnectivityRESTful(uri, outData);
        outData.type = ESL_GATEWAY_NAME;
        break;
      }
      case URI_TYPE.SENSORHUB:
      {
        //console.log('URI_TYPE.SENSORHUB ===============');
        getSensorHubRESTful( uri, outData );
        break;
      }
      case URI_TYPE.ESL:
      {
        console.log('URI_TYPE.ESL ===============');
        return procSetESLRESTful( uri, data, res, callback );
        break;
      }
      break;
      default:
      {
        console.log('UnKnow URI ===============');
        break;
      }
    }
         
    
    if ( typeof outData.ret !== 'undefined' )
    {  
        var jObj = JSON.parse(outData.ret);  
        console.log('[wsnput] ret '+ jObj['n'] + 'asm= ' + jObj['asm'] );
        if( typeof jObj['n'] !== 'undefined' && typeof jObj['asm'] !== 'undefined' ) 
        {
            if( jObj['asm'].indexOf('w') == -1 ) // Read-Only
            {
                callback(res, STATUS.FORBIDDEN, '{"sv":"Read Only"}');
                code = STATUS.FORBIDDEN;    
                return code;                            
            }
            else
                return procSetRestful(uriType, outData.type , uri, data, res, callback );
        }   
        else
        {
            callback(res, STATUS.BAD_REQUEST, '{"sv":"Bad Request"}');
            code = STATUS.BAD_REQUEST;
            return code;
        }
    }

    callback(res, STATUS.NOT_FOUND, '{"sv":"Not Found"}');
    return code;
}


//     ============== <RESTful> ==============




// <3>  ============== <Event> ==============
var addListener = function( userFn )
{
    if( userFn != undefined )
        eventEmitterObj.addListener(groupName,userFn);
}
//     ============== <Event> ==============



// <4>   ============== <Export> ==============
module.exports = {
  group: groupName,
  routers: routers,
  get: wsnget,
  put: wsnput,
  events: WSNEVENTS,
  addListener: addListener,
  wsclients: wsclients,
};
//      ============== <Export> ==============

// Main Code

InitModule();

// MQTT
//var Client  = Mqtt.connect('mqtt://172.22.12.41');

var Client  = Mqtt.connect('mqtt://127.0.0.1');

Client.on('connect', mqttConnectCallback );
Client.on('message', mqttMessageCallback);
Client.on('offline', mqttDisconnectCallback);













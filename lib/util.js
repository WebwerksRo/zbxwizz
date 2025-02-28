Array.prototype.unique = function(){
    return this.filter((value, index, array)=>{
        return array.indexOf(value) === index;
    });
};

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

/**
 *
 * @param opts
 */
function normal_modal(opts = {}) {
    let $modal = $("#generic_modal").clone().appendTo("body").removeAttr("id")   // clone modal template
        .on("hidden.bs.modal", () => $modal.remove())  // setup cleanup after modal is closed
        .modal();   // open modal
    let header = $modal.find(".modal-header");
    let footer = $modal.find(".modal-footer");

    // set modal title if present
    if (!opts.title) {
        header.remove()
    } else {
        header.html(opts.title);
    }

    // set footer if present
    if (opts.footer) {
        $modal.find(".modal-header").html(opts.footer)
    }

    try {
        if(opts.buttons) {
            footer.empty();
            opts.buttons.forEach(btn=>{
                let $btn = $("<button>").attr("type","button").addClass("btn btn-sm btn-"+btn.class).text(btn.text).on("click",()=>btn.action($modal)).appendTo(footer);
                if(btn.attrs) {
                    Object.keys(btn.attrs).forEach(attr=>$btn.attr(attr,btn.attrs[attr]));
                }
            });
        }
    }
    catch(e){}
    if(!footer.children().length) footer.remove();

    // set modal content
    $modal.find(".modal-body").empty().append(opts.body ? opts.body : "No content");

    if (opts.size) {
        $modal.find(".modal-dialog").addClass("modal-" + opts.size);
    }

    return $modal;
}
//
//
// function confirm_modal(message,yesCb,noCb=new Function()) {
//     let modal = normal_modal({
//         body: $(message),
//         buttons: [
//             {
//                 text: "Yes",
//                 action: yesCb,
//                 class: "primary"
//             },
//             {
//                 text: "No",
//                 action: noCb,
//                 class: "secondary"
//             }
//         ]
//     })
// }

/**
 *
 * @param message
 * @param callback
 * @param value
 */
function prompt_modal(message,callback,value="") {
    let formid= "a"+generateShortUUID();
    let form = $(`
    <form id="${formid}">
    <div class="form-group">
        <label>${message}</label>
        <input type="text" value="${value}" name="response" class="form-control" required>
    </div>
    </form>
    `).on("submit",(event)=>{
        event.preventDefault();
        callback(event.target.response.value);
        modal.modal("hide");
    });
    const modal = normal_modal({
        body: form,
        buttons: [
            {
                text: "OK",
                action: ()=>{

                    //callback(form[0].response.value)
                },
                attrs:{
                    form:formid,
                    type: "submit"
                },
                class: "primary"
            },
            {
                text: "Cancel",
                action: ()=>{
                    console.log(modal);
                    modal.modal("hide");
                    callback(null);
                },
                class: "secondary"
            }
        ]
    })
}

function confirm_modal(text,yesCb=new Function(),noCb=new Function()) {
    let modal = normal_modal({
        body: text,
        buttons: [
            {
                text: "Yes",
                action: ()=>{
                    modal.modal("hide");
                    yesCb()
                },
                class: "success"
            },
            {
                text: "No",
                action: ()=>{
                    modal.modal("hide");
                    noCb()
                },
                class: "danger"
            },
        ]
    })
}

/**
 *
 * @param obj
 * @param keyLbl
 * @param valLbl
 * @returns {unknown[]}
 */
function obj2array(obj,keyLbl="key",valLbl="val"){
    return Object.keys(obj)
        .map(key=>{
            let item = {};
            item[keyLbl] = key;
            item[valLbl] = obj[key];
            return item;
        });
}

/**
 *
 * @param {Array} arr
 * @param {String} keyProp
 * @param {String} valProp
 */
function objectsArray2object(arr,keyProp,valProp) {
    return arr.reduce((res,item)=>{
        res[item[keyProp]]=item[valProp];
        return res;
    },{})
}

function json(obj,opt1=null,opt2=null) {
    return JSON.stringify(obj,opt1,opt2)
}

function obj(str) {
    return JSON.parse(str);
}

function dragable_modal(opts) {
    let tpl = `<div class="card draggableModal" id="draggableModal" style="position: absolute">
            <div class="card-header d-flex">
                <div class="flex-grow-1 dgm-modal-title"></div>
                <div class="mr-1"><span onclick="$(this).parents('.draggableModal').hide()" style="cursor: pointer"><i class="fa fa-times-rectangle"></i></span></div>
            </div>
            <div class="card-body"></div>
            <div class="card-footer text-right"></div>
        </div>`;
    let modal = $(tpl).appendTo('body').draggable({ handle: ".card-header" }).resizable().css("position","absolute !important");
    modal.find(".dgm-modal-title").html(opts.title);
    modal.find(".card-body").empty().append(opts.body);
    let footer = modal.find(".card-footer").empty();

    if(opts.afterCreate) {
        opts.afterCreate(modal);
    }
    try {
        Object.keys(opts.attrs).forEach(attr=>modal.attr(attr,opts.attrs[attr]));
    }
    catch (e) { }

    try {
        opts.buttons.forEach(btn=>{
            if(!btn.action || typeof btn.action!=="function")
                btn.action = new Function();
            let $btn = $("<button>").addClass("btn btn-sm btn-"+btn.class).text(btn.text).on("click",()=>btn.action(modal)).appendTo(footer);
            if(btn.attrs) {
                Object.keys(btn.attrs).forEach(attr=>$btn.attr(attr,btn.attrs[attr]));
            }
        });
    }
    catch (e) {
        //console.log(e)
    }

    if(!footer.children().length)
        footer.hide();

    return modal;
}

function generateShortUUID() {
    return Math.random().toString(36).substr(2, 7); // Generates a random string of 9 characters
}

function generateUID() {
    // I generate the UID from two parts here
    // to ensure the random number provide enough bits.
    let firstPart = (Math.random() * 46656) | 0;
    let secondPart = (Math.random() * 46656) | 0;
    firstPart = ("000" + firstPart.toString(36)).slice(-3);
    secondPart = ("000" + secondPart.toString(36)).slice(-3);
    return firstPart + secondPart;
}
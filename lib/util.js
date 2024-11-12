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



function prompt_modal(message,callback,value="") {
    let formid= generateShortUUID();
    let form = $(`
    <form id="${formid}">
    <div class="form-group">
        <label>${message}</label>
        <input type="text" value="${value}" name="response" class="form-control">
    </div>
    </form>
    `);
    let modal = normal_modal({
        body: form,
        buttons: [
            {
                text: "OK",
                action: ()=>{
                    modal.modal("hide");
                    callback(form[0].response.value)
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

function confirm_modal(text,callback) {
    let modal = normal_modal({
        body: message,
        buttons: [
            {
                text: "Yes",
                action: ()=>{
                    modal.modal("hide");
                    callback(true)
                },
                class: "success"
            },
            {
                text: "No",
                action: ()=>{
                    modal.modal("hide");
                    callback(false)
                },
                class: "danger"
            },
        ]
    })
}


function dragable_modal(opts) {
    let tpl = `<div class="card draggableModal" id="draggableModal" style="position: absolute">
            <div class="card-header d-flex">
                <div class="flex-grow-1 dgm-modal-title"></div>
                <div class="mr-1"><span onclick="$(this).parents('.draggableModal').remove()" style="cursor: pointer"><i class="fa fa-times-rectangle"></i></span></div>
            </div>
            <div class="card-body"></div>
            <div class="card-footer text-right"></div>
        </div>`;
    let modal = $(tpl).appendTo('body').draggable({ handle: ".card-header" }).resizable().css("position","absolute !important");
    modal.find(".dgm-modal-title").html(opts.title);
    modal.find(".card-body").empty().append(opts.body);
    let footer = modal.find(".card-footer").empty();
    try {
        Object.keys(opts.attrs).forEach(attr=>modal.attr(attr,opts.attrs[attr]));
    }
    catch (e) { }

    try {
        opts.buttons.forEach(btn=>{
            let $btn = $("<button>").addClass("btn btn-sm btn-"+btn.class).text(btn.text).on("click",()=>btn.action(modal)).appendTo(footer);
            if(btn.attrs) {
                Object.keys(btn.attrs).forEach(attr=>$btn.attr(attr,btn.attrs[attr]));
            }
        });
    }
    catch (e) {
        //console.log(e)
    }
    console.log(modal)

    if(!footer.children().length)
        footer.hide();

    return modal;
}
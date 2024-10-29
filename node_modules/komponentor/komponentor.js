/**
 *
 */
(function ($) {
    window.komponentor = {
        components: {},
        path: null
    };

    komponentor.routing = (function(){
        let tmp = window.location.hash;
        let res = {
            path: null,
            paras: {}
        };

        if(!tmp)
            return res;
        tmp = tmp.substr(1);
        let paras = tmp.split("|");
        res.path = paras.shift();
        res.paras = {}
        paras.forEach(function (f) {
            let tmp = f.split("=");
            res.paras[tmp[0]] = tmp[1];
        });

        return res;
    })();

    window.onhashchange = function () {
        window.location.reload();
    };

    /**
     *
     * @param opts
     * @returns {Promise<unknown>}
     */
    $.fn.komponent = function (opts) {
        if(typeof opts==="undefined") {
            opts = {};
        }
        if(typeof opts==="string") {
            opts = {url:opts};
        }

        let options = this.data();
        if(typeof options==="undefined") {
            options = {};
        }
        Object.assign(options,opts);
        options.$el = this;

        return new Promise(function (resolve, reject) {
            Komponent(options)
                .then(function (k) {
                    if(!k) {
                        return;
                    }
                    k.$el.data("komponent",k);
                    resolve(k);
                })
                .catch(function (msg) {
                    options.$el.html("Failed to load Komponent");
                    reject(msg);
                })
                .finally(function () {
                    options.$el.removeData("locked");
                });
        });

    };

    /**
     * @param options
     * @returns {Promise<unknown>}
     * @constructor
     */
    function Komponent(options) {
        let kmp = {
            $el: null,
        };

        delete options["komponent"];

        Object.assign(kmp,options);

        return new Promise(function (resolve,reject) {
            if(kmp.$el && (kmp.$el.data("komponent") || kmp.$el.data("locked"))) {
                resolve(options.$el.data("komponent"));
                return;
            }

            if(kmp.$el) {
                kmp.$el.data("locked",true);
            }

            komponentor
                .fetchKomponent(kmp)
                .then(function (html) {
                    let init_result = renderKomponent(kmp,html);
                    resolve(kmp,init_result);
                })
                .catch(function (msgObj) {
                    reject(msgObj)
                });
        });
    }

    String.prototype.hashCode = function()
    {
        let hash = 0, i, chr;
        if (this.length === 0) return hash;
        for (i = 0; i < this.length; i++) {
            chr   = this.charCodeAt(i);
            hash  = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return Math.abs(hash);
    };

    /**
     *
     * @param k
     * @param html
     */
    function renderKomponent(k,html) {
        let dummy = $("<div>").appendTo("body");

        let $renderedKomponent = $(html).appendTo(dummy);

        $renderedKomponent = $renderedKomponent.remove();
        dummy.remove();

        userData = (typeof userData=="undefined") ? null : userData;
            
        let userId = (userData && userData.sub) ? userData.sub : null;
        let userLvl = (userData && userData.level) ? userData.level : null;
        let allRights = localStorage.getItem("rights") ? JSON.parse(localStorage.getItem("rights")) : null;

        function checkRights (module) {
            let rights = allRights[module];
            // console.log("rights",module,rights);
            if (rights.indexOf("r") === -1) {
                // todo: show not enough rights
                return;
            }
            $renderedKomponent.find(".module-"+module);

            $renderedKomponent.find(".checkRead").each(function () {
                $(this).addClass("readAllow");
            });

            if (rights.indexOf("c") !== -1) {
                $renderedKomponent.find(".checkCreate").each(function () {
                    $(this).addClass("createAllow");
                });
            }

            if (rights.indexOf("u") !== -1) {
                $renderedKomponent.find(".checkUpdate").each(function () {
                    $(this).addClass("updateAllow");
                });
            }

            if (rights.indexOf("d") !== -1) {
                $renderedKomponent.find(".checkDelete").each(function () {
                    $(this).addClass("deleteAllow");
                });
            }
        }

        function getUserRights () {
            return new Promise((resolve, reject) => {
                console.log("getUserRights",apiRoot,"*************");
                $.ajax({
                    url: apiRoot + "/users/" + userId + "/users_meta/?filter=meta_key=~rights.",
                    type: "GET",
                    success: function (data) {
                        let rights = {};
                        data.data.forEach(function (item) {
                            rights[item.attributes.meta_key.slice(7)] = JSON.parse(item.attributes.meta_val);
                        });
                        localStorage.setItem("rights", JSON.stringify(rights));
                        resolve();
                    },
                    error: function (err) {
                        //todo: handle error
                        reject("getUserRights/reject: " + err.toString());
                    }
                });
            });
        }

        function getExpiryTime () {
            return new Promise((resolve, reject) => {
                $.get(apiRoot + "/settings/?filter=key=data_expiry_time")
                    .done(function(data) {
                        if (!data.data.length) {
                            resolve();
                            return;
                        }
                        let expiryTime = data.data[0].attributes.value;
                        let dateNow = new Date();
                        dateNow.setHours(dateNow.getHours() + parseInt(expiryTime));
                        localStorage.setItem("dataExpires", dateNow.toISOString());
                        resolve(dateNow.toISOString());
                    })
                    .fail(function(err) {
                        //todo: handle error
                        reject("getExpiryTime/reject: " + err.toString());
                    });
            })
        }

        /**
         *
         * @returns {Promise<unknown>}
         */
        function getActiveModules () {
            return new Promise((resolve, reject) => {
                $.get(apiRoot + "/settings/?filter=key=~module.")
                    .done(function (data) {
                        let modules = [];
                        data.data.forEach(function (item) {
                            if (item.attributes.value === "1")
                                modules.push(item.attributes.key.slice(7));
                        });
                        localStorage.setItem("activeModules", JSON.stringify(modules));
                        resolve();
                    })
                    .fail(function (err) {
                        reject("getActiveModules/reject: " + err.toString());
                    });
            });
        }

        /**
         * get settings
         * @returns {Promise<unknown>}
         */
        function getAllSettings () {
            return new Promise(((resolve, reject) => {
                if (userId === null) {
                    return resolve();
                }

                let expiryTime = new Date(localStorage.getItem("dataExpires"));
                if (expiryTime === null || expiryTime < new Date() || allRights === null ||
                    (typeof allRights==="object" && allRights.constructor===Object && Object.getOwnPropertyNames(allRights).length===0) ||
                    (typeof allRights==="object" && allRights.constructor===Array && allRights.length===0) ||
                    localStorage.getItem("activeModules") === null ||
                    localStorage.getItem("activeModules") === "" ||
                    localStorage.getItem("dataExpires") === null ||
                    localStorage.getItem("dataExpires") === "") {

                    getUserRights()
                        .then(function () {
                            return getExpiryTime();
                        }).then(function () {
                        return getActiveModules();
                    }).then(function () {
                        resolve();
                    }).catch(function (error) {
                        reject("getAll/rejected: ", error.toString());
                    });
                    return;
                }

                resolve();
            }));
        }

        function checkAccess() {
            return new Promise((resolve, reject) => {
                // console.log("check access");
                if (userId === null)
                    resolve(true);

                let allowInit = false;
                let checkCount = 0;
                $renderedKomponent.filter(".checkRequired").each(function () {
                    let moduleName = $(this).data("module");
                    let levelIdx = $(this).data("level");

                    if (userLvl >= levelIdx) {
                        allowInit = true;
                        checkRights(moduleName);
                    }
                    checkCount++;
                });

                if (allowInit || !checkCount) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            });
        }

        /**
         *
         * @returns {Promise<unknown>}
         */
        function initKomponent () {
            return new Promise(function(resolve) {
                let initFunc = typeof init_komponent==="function" ? init_komponent : new Function();

                if(k.$el && $renderedKomponent.length) {
                    if(k.replace) {
                        // let id = k.$el.attr("id");
                        k.$el.replaceWith($renderedKomponent);
                        k.$el = $renderedKomponent;
                        // k.$el.attr("id",id);
                    }
                    else {
                        k.$el.append($renderedKomponent);
                    }
                }

                if(!k.$el) {
                    k.$el = $renderedKomponent;
                }


                k.$el.data("komponent",k)
                    .attr("is","komponent")
                    .find("*").data("komponent",k);



                let moduleName = initFunc(k);


                let modules = JSON.parse(localStorage.getItem("modules"));
                if(modules && modules[moduleName]) {
                    k.$el.addClass(modules[moduleName].join(" "));
                }

                resolve(true);
            });
        }


        if(typeof k.checkAccess==="undefined" || k.checkAccess.constructor!==Function && k.checkAccess()) {
            initKomponent();
        }


        // return;

        getAllSettings()
            .then(function () {
                return checkAccess();
            }).then(function (result) {
            if(result) {
                return ;
            }
        }).catch(function (reject) {
            console.log("renderKomponent/reject: ", reject.toString());
        });

    }

    /**
     *
     * @returns {Promise<unknown>}
     * @param opts
     */
    komponentor.fetchKomponent = function(options) {

        return new Promise((resolve,reject)=>{

            if(!options.url) {
                reject({reason: "No Komponent URL provided",options:options,this:this});
            }

            // prepend kPath & append extension
            let url = (typeof _kPath !=="undefined"?_kPath:"") + options.url;
            let fileName = options.url.split("/").pop();
            if(fileName.length && fileName.indexOf(".")===-1 && typeof _kExt !== "undefined") {
                url += _kExt;
            }


            if(options.url.indexOf("?")===-1) {
                url += "?v=1";
            }

            // load component
            $.get(url)
                .done(function (responseData) {
                    resolve(responseData);
                })
                .fail(function (xhr) {
                    reject({reason: "fail to initiate component because failed ajax request",xhr: xhr, request: options});
                });
        });
    };

    /**
     *
     * @param container
     * @returns {Promise<unknown[]>}
     */
    function loadKomponents(container) {

        let promises = [];
        $(container).find("[is=komponent]").each(function () {
            promises.push($(this).komponent());
        });

        return Promise.all(promises);
    }

    /**
     * default behaviour is to autoload komponents
     */
    $(document).ready(function () {
        if(typeof autoload!== "undefined" && !autoload) {
            return;
        }

        loadKomponents("body");
    });


    /**
     *
     * @param url
     * @param options
     * @returns {{data: data, options: (function(*): obj), send: (function(): Promise<unknown>), url: (function(*): obj)}}
     */
    komponentor.intent = function (url) {

        let init_data = {data:{}};
        let _data = {};

        let obj = {
            url: function(url) {
                init_data.url = url;
                return this;
            },
            data: function (attr,val) {
                if(typeof attr==="object") {
                    Object.assign(init_data.data,attr);
                    return this;
                }
                init_data.data[attr] = val;
                return this;
            },
            send: function (data) {
                if(data) {
                    obj.data(data);
                }
                // add overlay
                return   Komponent(init_data);
            }
        };

        if(url) {
            obj.url(url);
        }

        return  obj;
    };

    komponentor.sendIntent = function(options) {

        komponentor.fetchKomponent(options)
            .then(  function (c) {
                if(!c)
                    return;
                if(c.hasOwnProperty("exec"))
                    c.exec(options.data);
            })
            .catch(function (v) {
                console.log("could not load",v,options);
            })
            .finally(()=>{
                $overlay.remove();
            });
    };

    komponentor.loadKomponents = function(container) {

        return loadKomponents(container);
    }

})($);

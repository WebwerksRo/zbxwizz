class ZBXApi {
	status = false;

	/**
	 *
	 * @param url
	 * @param apiKey
	 * @param bulkquerymode
	 * @param batchSize
	 */
	constructor(url,apiKey,bulkquerymode="parallel",batchSize=10) {
		this.url = url;
		this.apiKey = apiKey;
		this.bulkquerymode = bulkquerymode;
		this.batchSize = batchSize;
	}

	/**
	 *
	 * @param {String} method
	 * @param {Array} reqArr
	 * @param {Function} doneCb
	 * @param {Function} errCb
	 * @param {Function} finalCb
	 * @param {Function} lastFinalCb
	 * @param {('paralel'|'seq'|'batch')} mode
	 * @param {number} batchSize
	 * @returns {Promise<void>}
	 */
	async bulk_req(method,reqArr,doneCb,errCb,finalCb) {
		const zbx = this;

		/**
		 *
		 * @param {Array} arr
		 * @param resolve
		 */
		function exec_seq(arr,resolve) {
			console.log("sequencial");
			let req = arr.shift();
			if(!req) {
				resolve();
				return;
			}

			zbx.req(method,req.params)
				.then((resp)=>{
					doneCb(resp,req.ctx)
				})
				.catch((err)=>{
					errCb(err,req.ctx)
				})
				.finally(()=>{
					finalCb(req.ctx);
					exec_seq(arr,resolve);
				})
		}

		/**
		 *
		 * @param arr
		 * @param resolve
		 */
		function exec_parallel(arr,resolve) {
			console.log(arr)
			let ps = [];
			arr.forEach(req=>{
				ps.push(zbx.req(method,req.params)
					.then((resp)=>{
						doneCb(resp,req.ctx);
					})
					.catch(err=>{
						errCb(err,req.ctx)
					})
					.finally(()=>{
						finalCb(req.ctx);
					}));
			});
			Promise.all(ps).finally(()=>{
				resolve();
			});
		}

		/**
		 *
		 * @param arr
		 * @param resolve
		 */
		function exec_batch(arr,resolve) {
			if(arr.length===0) {
				resolve();
				return;
			}
			let tmp = arr.splice(0,zbx.batchSize);

			exec_parallel(tmp,()=>{
				exec_batch(arr,resolve);
			})
		}

		return new Promise((resolve) => {
			console.log(zbx.bulkquerymode)
			switch (zbx.bulkquerymode) {
				case "parallel":
					exec_parallel(reqArr,resolve);
					break;
				case "seq":
					exec_seq(reqArr,resolve);
					break;
				case "batch":
					exec_batch(reqArr,resolve);
					break;
			}
		});

	}

	async get(resource,params,async=false) {
		try {
			if(async)
				return await this.req(resource+".get",params,async);
			else
				return this.req(resource+".get",params,async);
		}
		catch(e) {
			console.error(e);
			return null;
		}
	}

	async update(resource,params,async=false) {
		if(async)
			return await this.req(resource+".update",params,true);
		else
			return this.req(resource+".update",params,async);
	}

	async req(method,params,async=false) {
		
		let execParams = {};
		if(typeof params.limit !== "undefined" && params.limit===null)
			delete params.limit;

		if(method.match(/get$/i)) {
			execParams.limit = 5;
		}
		
		execParams = Object.assign(execParams,params);
		Object.keys(execParams).forEach(key=>{
			if(execParams[key]===undefined || execParams[key]===null)
				delete execParams[key];

		});
		// console.log(execParams);
		if(async) {
			
			const resp = await fetch(this.url, {
				method: "POST",
				headers: {
					"Content-Type":"application/json",
					"Authorization": "Bearer "+this.apiKey
				},
				body: JSON.stringify({
					jsonrpc: "2.0",
					method: method,
					params: execParams,
					id: 2
				})
			});
			
			let data = await resp.json();
			return data;
		}
		else {
			return new Promise((resolve,reject)=> {
				fetch(this.url, {
					method: "POST",
					headers: {
						"Content-Type":"application/json",
						"Authorization": "Bearer "+this.apiKey
					},
					body: JSON.stringify({
						jsonrpc: "2.0",
						method: method,
						params: execParams,
						id: 2
					})
				})
				.then((resp)=>resp.json().then(resolve).catch(reject))
				.catch(reject);
			});
		}
	}
	
}

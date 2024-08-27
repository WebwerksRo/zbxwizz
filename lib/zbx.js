class ZBXApi {
	constructor(url,apiKey) {
		this.url = url;
		this.apiKey = apiKey;
	}

	async get(resource,params,async=false) {
		if(async)
			return await this.req(resource+".get",params,async);
		else
			return this.req(resource+".get",params,async);
	}

	async update(resource,params,async=false) {
		if(async)
			return await this.req(resource+".update",params,true);
		else
			return this.req(resource+".update",params,async);
	}

	async req(method,params,async=false) {
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
					params: params,
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
						params: params,
						id: 2
					})
				})
				.then((resp)=>resp.json().then(resolve).catch(reject))
				.catch(reject);
			});
		}
	}
	
}

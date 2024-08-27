var ServiceNow = {
    params: {},

    setParams: function (params) {
        if (typeof params !== 'object') {
            return;
        }

        ServiceNow.params = params;
        if (typeof ServiceNow.params.url === 'string') {
            if (!ServiceNow.params.url.endsWith('/')) {
                ServiceNow.params.url += '/';
            }

            //ServiceNow.params.url += 'api/now/table/incident';
            ServiceNow.params.url += 'api/now/import/x_rweag_zabbix_import_zabbix_incident';
        }
    },

    setProxy: function (HTTPProxy) {
        ServiceNow.HTTPProxy = HTTPProxy;
    },

    setFields: function (data, fields) {
        if (typeof fields === 'object' && Object.keys(fields).length) {
            Object.keys(fields)
                .forEach(function(field) {
                    data[field] = (fields[field].match(/^\d{4}\.\d{2}\.\d{2}$/) !== null)
                        ? fields[field].replace(/\./g, '-')
                        : fields[field];
                });
        }
    },

    request: function (method, data) {
        ['url', 'user', 'password'].forEach(function (field) {
            if (typeof ServiceNow.params !== 'object' || typeof ServiceNow.params[field] === 'undefined'
                || ServiceNow.params[field] === '' ) {
                throw 'Required ServiceNow param is not set: "' + field + '".';
            }
        });

        var response,
            url = ServiceNow.params.url,
            request = new HttpRequest();

        request.addHeader('Content-Type: application/json');
        request.addHeader('Authorization: Basic ' + btoa(ServiceNow.params.user + ':' + ServiceNow.params.password));

        if (typeof ServiceNow.HTTPProxy !== 'undefined' && ServiceNow.HTTPProxy !== '') {
            request.setProxy(ServiceNow.HTTPProxy);
        }

        if (typeof data !== 'undefined') {
            data = JSON.stringify(data);
        }

        Zabbix.log(4, '[ ServiceNow Webhook ] Sending request: ' + url + ((typeof data === 'string')
            ? ('\n' + data)
            : ''));

        switch (method) {
            case 'get':
                response = request.get(url, data);
                break;

            case 'post':
                response = request.post(url, data);
                break;

            case 'put':
                response = request.put(url, data);
                break;

            default:
                throw 'Unsupported HTTP request method: ' + method;
        }

        Zabbix.log(4, '[ ServiceNow Webhook ] Received response with status code ' +
            request.getStatus() + '\n' + response);

        if (response !== null) {
            try {
                response = JSON.parse(response);
            }
            catch (error) {
                Zabbix.log(4, '[ ServiceNow Webhook ] Failed to parse response received from ServiceNow');
                response = null;
            }
        }

        if (request.getStatus() < 200 || request.getStatus() >= 300) {
            var message = 'Request failed with status code ' + request.getStatus();

            if (response !== null && typeof response.error.message !== 'undefined'
                && Object.keys(response.error).length > 0) {
                message += ': ' + JSON.stringify(response.error.message);
            }

            throw message + ' Check debug log for more information.';
        }
        else if (typeof response.result !== 'object' || typeof response.result[0].sys_id === 'undefined') {
            throw 'Cannot create ServiceNow incident. Check debug log for more information.';
        }

        return response.result[0];
    }
};

try {
    var params = JSON.parse(value),
        fields = {},
        servicenow = {},
        data = {},
        result = {tags: {}},
        required_params = [
            'alert_subject', 'alert_message', 'event_source', 'u_event_value',
            'event_update_status', 'event_recovery_value', 'event_nseverity'
        ],
        severities = [
            {name: 'not_classified', color: '#97AAB3'},
            {name: 'information', color: '#7499FF'},
            {name: 'warning', color: '#FFC859'},
            {name: 'average', color: '#FFA059'},
            {name: 'high', color: '#E97659'},
            {name: 'disaster', color: '#E45959'},
            {name: 'resolved', color: '#009900'},
            {name: 'default', color: '#000000'}
        ],
        method = 'post',
        process_tags = true;

    Object.keys(params)
        .forEach(function (key) {
            if (key.startsWith('servicenow_')) {
                servicenow[key.substring(11)] = params[key];
            }
            else if (key.startsWith('u_')) {
                fields[key] = params[key];
            }
            else if (required_params.indexOf(key) !== -1 && params[key] === '') {
                throw 'Parameter "' + key + '" can\'t be empty.';
            }
        });

    if ([0, 1, 2, 3].indexOf(parseInt(params.event_source)) === -1) {
        throw 'Incorrect "event_source" parameter given: ' + params.event_source + '\nMust be 0-3.';
    }

    if ([0, 1, 2, 3, 4, 5].indexOf(parseInt(params.event_nseverity)) === -1) {
        params.event_nseverity = '7';
    }

    // Check {EVENT.VALUE} for trigger-based and internal events.
    if (params.u_event_value !== '0' && params.u_event_value !== '1'
        && (params.event_source === '0' || params.event_source === '3')) {
        throw 'Incorrect "u_event_value" parameter given: ' + params.u_event_value + '\nMust be 0 or 1.';
    }

    // Check {EVENT.UPDATE.STATUS} only for trigger-based events.
    if (params.event_update_status !== '0' && params.event_update_status !== '1' && params.event_source === '0') {
        throw 'Incorrect "event_update_status" parameter given: ' + params.event_update_status + '\nMust be 0 or 1.';
    }

    if (params.event_source !== '0' && params.event_recovery_value === '0') {
        throw 'Recovery operations are supported only for trigger-based actions.';
    }

    data.u_short_description = params.alert_subject;
    data.u_description = params.alert_message;
    data.u_comment = params.alert_message;
    data.u_event_value = params.u_event_value;

    // CB: Not needed since mapping between Zabbix severities and ServiceNow urgency is done in ServiceNow
    //if (typeof params['urgency_for_' + severities[params.event_nseverity].name] !== 'undefined') {
    //    data.urgency = params['urgency_for_' + severities[params.event_nseverity].name];
    //}

    // Map team assignment tags to u_assignment_group
    var teamsIds = {
        "INFRASTRUCTURE": "d04a745f1bc4f9548007ba688b4bcbcf",
        "ZABBIX":"e5016bdc1b7d0ed8390b657faa4bcb62",
        "default":"f9d0b911dbacb1505d6d5117f39619bb",
        "HelpDesk":"3d1640ac1b73e514390b657faa4bcbf0",
        "NETWORK":"911381ce1b20f1908007ba688b4bcba0"
    };
    var firstLevel = typeof params["first_level"]!=="undefined" ? params["first_level"]*1 : 0;
    data.u_assignment_group = params['team_assignment'] && teamsIds[params['team_assignment']] 
        ? teamsIds[params['team_assignment']]
        : teamsIds["default"];
    data.assignment_group = data.u_assignment_group;


    // if (typeof params['team_assignment'] !== 'undefined') {
    //     if (params['team_assignment'] === 'INFRASTRUCTURE') {
    //         data.u_assignment_group = 'd04a745f1bc4f9548007ba688b4bcbcf';
    //     }
    //     else if (params['team_assignment'] === 'NETWORK') {
    //         data.u_assignment_group = '911381ce1b20f1908007ba688b4bcba0';
    //     }
    // }
    // else {
    //     data.u_assignment_group = 'f9d0b911dbacb1505d6d5117f39619bb';
    // }
    result.tags.__zbx_servicenow_groupid = data.assignment_group;
    return JSON.stringify(result);
    10.112.61.98
    // C:\Zabbix\zabbix_sender.exe -z 10.112.61.14 -s "ServiceNow Test" -k "serviceNowTest[trapper]" -o "1"

    ServiceNow.setParams(servicenow);
    ServiceNow.setProxy(params.HTTPProxy);
    ServiceNow.setFields(data, fields);

    // EVENT_SOURCE: 0 - Trigger
    // EVENT_VALUE: 1 - Problem; 0 - Recovering
    // EVENT_UPDATE_STATUS: 0 - Webhook was called because of problem/recovery event, 1 - Update operation

    // CB: Only send update if incident has been created (sys_id existing)
    if (params.servicenow_sys_id !== '{EVENT.TAGS.__zbx_servicenow_sys_id}' && params.event_source === '0' && (params.u_event_value === '0' || params.event_update_status === '1')) {
        delete data.description;
        delete data.urgency;
        data.u_sys_id = params.servicenow_sys_id;

        var response = ServiceNow.request(method, data);
        return JSON.stringify(result);
    }

    // CB: Or create new incident
    else if (params.event_source === '0' && params.u_event_value === '1' && (params.event_update_status === '0' || params.event_ack_status === 'Yes')) {
        var response = ServiceNow.request(method, data);

        // Parse response and set tags
        result.tags.__zbx_servicenow_sys_id = response.sys_id;
        result.tags.__zbx_servicenow_link = params.servicenow_url +
            (params.servicenow_url.endsWith('/') ? '' : '/') + 'incident.do?sys_id=' + response.sys_id;
        result.tags.__zbx_servicenow_number = response.display_value;

        return JSON.stringify(result);
    }
    // CB: If there's an update without an initial incident creation (sys_id existing), skip it.
    else {
        return 'Nothing sent.'
    }
}
catch (error) {
    Zabbix.log(3, '[ ServiceNow Webhook ] ERROR: ' + error);
    throw 'Sending failed: ' + error;
}
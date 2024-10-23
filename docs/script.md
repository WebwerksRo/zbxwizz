Hello
My name is...
In this presentation I will introduce you to ZabbixWizzard.
What is ZabbixWizz. Zabbix Wizz is an ETL type of tool, that is extract-transform-load.

To better understand what this tool does, I will start by talking about the problems that it solves.

I am working as a network monitoring engineer for a large company. We currently monitor with Zabbix more that 6000 hosts and more than 30k monitoring items. 

Along the typical daily activities we do run from time to time various projects meant to improve the overall performance and usability of Zabbix. One of those projects is about cleaning up the current configuration data, which basically it means giving meaningfull names to all the hosts, placing them in the correct hostgroups, setting various tags and so on. 

As you can imagine processing all this data is a huge job. We need to export data from Zabbix, process it, augment it and push it back.
Getting data from Zabbix can be done either through standart Zabbix exports, through the API or directly from the database. Either way, you cannot escape the task of writing some scripts either for extracting the data or processing or both of them.

At the same time, quite often we need to correlate data from multiple sources. For example, we want to know whats the ICMP ping status for each of the hosts and so on.

After that we need to do various batch processing jobs on the extracted data and in the end export this data to a CSV so that we can further process it in Excel.

Normally only to get this part done one already needs to write a good deal of scripts.

Since I am using local Zabbix installation containing almost no data, I will start by creating some Hosts and Host groups in Zabbix


1st step is to connect ZbxWizz with Zabbix by providing the API URL and the API key.

For the data to load, I have prepared 
  Math.random(256) + "." + Math.random(256) + "." + Math.random(256) + "." + Math.random(256)
  {
    "jsonrpc": "2.0",
    "method": "host.create",
    "params": {
      "host": "Linux server",
      "interfaces": [
        {
          "type": 1,
          "main": 1,
          "useip": 1,
          "ip": "192.168.3.1",
          "dns": "",
          "port": "10050"
        }
      ],
      "groups": [
        {
          "groupid": "50"
        }
      ],
      "tags": [
        {
          "tag": "Host name",
          "value": "Linux server"
        }
      ],
      "templates": [
        {
          "templateid": "20045"
        }
      ],
      
    },
    "id": 1
  }
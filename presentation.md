#ZbxWizz

ZbxWizz is a GUI tool for working with Zabbix data meant to ease the complex configuration operations of large scale (and not only) Zabbix deployments. It does this by implementing a workflow consisting of the following steps
 1.import => 2.sync (optional) & transform => 3.deploy (or export).

## Intro
### The problem
Working with Zabbix, especially in large scale deployments, can be a daunting task. Tens of thousands of items and even more need to be created, modified or deleted. Of course we're not talking about daily operations, which are mostly about handling alarms and performing minor changes (adding new hosts, removing discontinued ones and so on). We are talking here about BIG things: migration to Zabbix from other systems, mass updating of data in Zabbix because of various reasons, like bringing order to the naming/tagging/grouping chaos and so on. Whatever the scope, when you deal with a lot of data you definitely need scripting for importing, transforming and deploying. 

The usual (and simplified) workflow is that the engineering team  does a lot of work filtering, adding, transforming some data (based or not on some Zabbix exports) generating some excel files and handles them to a SW developer which will create some scripts to implement the configuration throught the Zabbix API.

We are talking here about 5 main complex operations:
- inital data import, gathering or generation
- data tranformation
- data corelation (and synchronisation) with other sources
- configuration generation
- deployment

### The solution
ZbxWizz can import data, synchronize it with various other sources, bulk create new items, update or delete existing ones, while assisting you in the process of transforming the data.  

In order to keep it's flexibility and full power, ZbxWizz is actually agnostic from the point of view of the Zabbix API. It relies on a plugins to fetch data and render it a a table, with rows having attached to them the full data object, which later on can be used to transform the table fields and generate new ones. The user is responbile to compose the request, therefore, in order to use ZbxWizz, one must have a minimal knowledge of Zabbix API and JavaScript.

##How it works.

###Step 1: Import data

Data can be imported either from a CSV or directly from Zabbix.  Importing data from a CSV is pretty straight forward. Let’s see it action

….

As mentioned before, importing data from Zabbix is done through API calls which one must design by himself in order to fulfull his needs.

Let’s take a look at some examples
…..
Example 1.
Import all hosts with just a limited set of fields
Example 2.
Import all hosts that belong to a certain host group
Example 3.
Import all hosts that have a certain tag
Example 4:
Import items that belong to a certain host
Example 5:
Import hosts with their tags, host groups and templates 


###Step 2: Sync

After the initial import, it might be needed to collect some additional data from Zabbix for each row that will be used in the transformation phase. This data is retrieved again by composing an API request which will be executed for each row in the data table and the resulted response will be attached as a data object to the record on which is was executed. This object can be later on used to transform current fields or create new new ones.



###Step 3: Transform


###Step 4: Push
 
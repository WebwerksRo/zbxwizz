# ZbxWizz documentation

- [ZbxWizz documentation](#zbxwizz-documentation)
  - [Introduction](#introduction)
  - [Installation](#installation)
  - [Using ZbxWizz - short intro](#using-zbxwizz---short-intro)
    - [Data import](#data-import)
    - [Data augmentation](#data-augmentation)
    - [Data manipulation](#data-manipulation)
    - [Pushing data to Zabbix](#pushing-data-to-zabbix)
  - [Configuring Zabbix API connection](#configuring-zabbix-api-connection)
  - [Importing data](#importing-data)
    - [Importing data from CSV](#importing-data-from-csv)
    - [Importing data from XLS](#importing-data-from-xls)
    - [Importing data from Zabbix](#importing-data-from-zabbix)
    - [Import from JavaScript](#import-from-javascript)
  - [Working with active data set](#working-with-active-data-set)
    - [Selecting rows](#selecting-rows)
    - [Sorting](#sorting)
    - [Filtering](#filtering)
    - [Manual editing](#manual-editing)
    - [Row operations](#row-operations)
    - [Transformations](#transformations)
    - [Augmenting data](#augmenting-data)
    - [Copy rows to different sheet](#copy-rows-to-different-sheet)
    - [Delete rows](#delete-rows)
    - [Rename columns](#rename-columns)
    - [Rename worksheets](#rename-worksheets)
    - [Reorder columns](#reorder-columns)
  - [Exporting data](#exporting-data)
    - [Exporting data to CSV](#exporting-data-to-csv)
    - [Exporting data to Zabbix](#exporting-data-to-zabbix)

## Introduction

ZbxWizz is a tool that helps you automate your Zabbix workflows.

It presents iself as a spreadsheet editor which connects to Zabbix API, allowing you to create, edit, update and delete Zabbix resources.

## Installation

Clone the repo on your machine and open the index.html file using your favorite browser. You should also disabled CORS by using a plugin or by playing with the advanced browser settings, otherwise the browser policy will block the requests to the Zabbix API. How to do this is beyond the scope of this documention so google it.

An Electron version and Zabbix module are in the making so stay tunned by subscribing to our mailing list.

## Using ZbxWizz - short intro

The typical workflow with ZbxWizz involves the following steps, given that the Zabbix API connection is already configured.

```text
                        |------------------------|                
                        | Edit current data set  |             
                        | ---------------------- |               
  ------------------    | |   Manual editing   | |    |----------------|
  |  Import data   |    | ---------------------- |    |   Export data  |
  |      from      | -> | ---------------------- | -> |       to       |
  | Zabbix/CSV/XLS |    | | JS transformations | |    | Zabbix/CSV/XLS |
  ------------------    | ---------------------- |    |----------------|
                        | ---------------------- |         
                        | | Data augmentation  | |             
                        | ---------------------- |             
                        |------------------------|                 
```

### Data import

Importing data from CSV and XLS files is pretty straightforward. Importing from Zabbix involves creating a Zabbix API request, while importing using JavaScript allows an even more flexible approach by writing a script that will generate the request. This is worth using when one wants to reuse data from other loaded sheets. Check out the [Importing data](#importing-data) section.

### Data augmentation

Given an active sheet which has data in it, there is the possibility to extract aditional data from Zabbix for each row.

Let's say the active sheet contains a list of IPs and you want to retrieve the hosts from Zabbix which are configured with those IPs. For this, go to **Zabbix Ops -> Pull**. In this window one can compose a Zabbix API request template which shall contain refferences to the column names.

As an example, let's say that the 1st column is the one containing the IPs and the name of the column is **IP** and you want to retrieve the host which has that IP configured. From the **resource** select box you will select **hostinterface**. The Data label field sets the name of the property that you will later use to access the retrieved data. And in the JSON code editor you will create the following request template:

```json
{
    "filter":{
        "ip":"${$0}"
    },
    "selectHosts":["host","name","hostid"....],
    "output":["interfaceid"]
}
```

Notice the value of the "ip" field in the filter. Using **\${\$0}** I am refferencing the value from the 1st column (numbering starts at 0). An alternative way to refference a column is by using its name, so we can also write this as **${_IP}**, where IP is the column name.

A request template is actually a JavaScript template literal. You can read more about it [here](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals). Notice also that the request is not a full Zabbix API request, but it refers only to the content of the **params** field. ZbxWizz takes care to create the full request based on the selected resource, method and the template that you provided.

Knowing how to formulate each API request by heart is a matter of experience. So you can always use the **?** button next to the resource selector which will take you to the Zabbix API documentation page for that specific operation.

Once the request has been defined, press the Execute button. ZbxWizz will iterate over each selected row, it will interpolate the row data with the template and perform the request. The result of the request will be attached to the row as an internal object which you can access in the tranformations by using the **data.{data_label}**. If you left the data label unmodified you will use **data.zbx** to access the result.

### Data manipulation

Rows can be sorted, filtered and transformed by clicking on the column index button. If the first 2 are obvious how to use, transforming the data is the thing that makes ZbxWizz so powerfull. All transformations are performed on the column level only for the visible rows. A transformation consist of a JavaScript expression, which will be evaluated and it's output will be set as the cell new value. 

In the JavaScript expressions one can reference other columns by using the column index ($2, $3 and so on) or the column name (_host, _ip and so on), the row data (as mentioned before, you can access the result of a pull by using data.zbx, or whatever other data label that you configured). There are more to tell about transformations in the dedicated section.

As an example let's assume I want to set the name of a host as consisting of a prefix and the IP, something like CountryCode - DevType - IP. In the current data set I have all these details loaded in the corresponding columns. The transformation expression to use for the new column with the name, will be:

```JavaScript
_CountryCode + " - " + _DevType + " - " + _IP
```

Notice I have used the column names, but using the column indexes would have achieved the same result.

### Pushing data to Zabbix

With the current data set one can create, update or delete resources in Zabbix. In order to do that access the **Zabbix Ops -> Push** menu. In a similar way with the Zabbix data pull, one has to select the Zabbix resource type, the operation and create the request parameters template. 

As a simple example, let's assume we want to create multiple hostgroups at once. In the active worksheet we have loaded a list of names on the 1st column for those hostgroups. The template will look like this:

```json
{
    "name":"${$0}"
}
```

By pressing the execute button, ZbxWizz will iterate over each selected row and, interpolate the template with the row data and execute the scriot. Upon succesfull execution, the row color will change to pale blue. If there was an error, the background color will be pale-peach. You can inspect the error, by clicking on the row index button and navigate to the bottom of the window where you should find the **lastError** property

## Configuring Zabbix API connection

Configuring the Zabbix API connection is done by accessing the red icon on the top right corner of the app.

You will be presented with a dialog where you can enter the Zabbix server URL and the API key and the API query mode. There are 3 modes of API query:

* sequential - in this mode, the API queries are executed sequentially, one after another. It's slower but safer, since it will not overload the server with parallel requests.
* parallel - in the mode all API requests for that specific row selection are executed at the same time. It actually depends on you browser settings if they will be actually all executed in parallel or rather in a pooled way. It is faster, but for write operations when dealing with a lot of records it might proove to be dangerous. From my experience, when creating new resources I've run a couple of times into a situation where data was corrupted in the DB.
* hybrid - In this mode, the API queries ar executed in sequential batches of parallel requests. It's a good compromise between speed and reliability. Currently, the batch size is 10 requests, but we will add the ability to configure the batch size in the future.

The API key should be obtained from the Zabbix user interface. Showing how to do it is beyond the scope of this documentation.

After entering the details click the "Save" button and this will save the data in the browser's local storage and reloaded from there each time you start the applicaton.

The Zabbix connection icon is bright red when the connection is available and pale red when the connection is not available. 

## Importing data

### Importing data from CSV

To import data from a CSV file, go to  **Data menu -> Import CSV** and select the file you want to import. You also need to select the target sheet where the data will be imported. 

The CSV file should have a header row with the column names.

### Importing data from XLS

To import data from an XLS file, go to **Data menu -> Import XLS**, select the file you want to import and you can select which worksheet to import. By default, all sheets are imported.

### Importing data from Zabbix

To import data from Zabbix server, you need to click the "Import from Zabbix" entry in the Data menu.

You will be presented with a dialog where you will select the Zabbix resource and using the built-in JSON editor create the Zabbix API template request in JSON format.

You can embed JavaScript code into the request template using the ${...} syntax.

The template is evaluated each time the request changes and a preview of the compiled request is displayed in the "Preview" section bellow the editor.

If the preview backgroung is green, the request is valid and if the background is red, the request is invalid.

The request is executed when you click the "Execute" button.

Currently, the request will be executed regardless if the preview is green or red.

### Import from JavaScript

You can import data from JavaScript by clicking the "Import from JavaScript" entry in the Data menu.

You will be presented with a dialog where you can write JavaScript code which will be executed and the result will be imported into the spreadsheet.

The JavaScript code has access to the following variables:

- worksheet.sheets.sheetName - the current cell value
- worksheet.sheets.sheetName - the sheet object identified by the sheetName.
- ws.sheetName.col(colIdx) - array containing all the values in the column identified by colIdx.
- ws.sheetName.rows\[rowIdx\] - array containing all the values in the row identified by rowIdx.
- ws.sheetName.lookup(lookupValue, lookupColumn, resultColumn) - lookup a value in the lookupColumn and return the value from the resultColumn.
- json(object) - convert an object to a JSON string.
- obj(jsonString) - convert a JSON string to an object.

## Working with active data set

### Selecting rows

Any pull/push operation is executed only agains selected and visible rows. Rows can be selected individually or in bulk by using the top left checkbox. The bulk select toggle will act only upon the visible rows. This means that if you selected in the past some rows and then applied some filter which hide them, using the bulk select toggle to deselect will not deselect the hidden rows.

### Sorting

Sorting is straightforward: click on the column index button and select the sorting direction from the menu.

### Filtering

You can filter the data in the spreadsheet by clicking on the column index in the table header and using the filter form in the displayed menu dialog. Keep in mind that the filter text is threated as a RegExp expression, so don't forget to escape special characters preceding them by a backslash.

### Manual editing

Double click any cell to enter cell edit mode. Exiting the edit mode is done by pressing Ctrl+Enter or by clicking outside the cell.

### Row operations

You can add, remove and duplicate rows by clicking on the row index button and selecting of the "Insert empty row before", "Insert empty row after", "Delete row", and "Duplicate row" entries in the row context menu.

### Transformations

The transformations are JavaScript expressions to transform the data in the target column. To use JavaScript transformations, click the "Column index" button in the table header of the column which you want to transform and select the transformation menu item.

You will be presented with a dialog where you can write small JavaScript snippets which must return a value.

The JS code has access to the following variables and functions:

- **self** - the current cell value
- **$columnIndex** - eg. $1, $2, $3, etc. - the index of the column
- **_columnName** - the name of the column
- **ws.sheetName** - the sheet object identified by the sheetName.
- **ws.sheetName.col(colIdx)** - array containing all the values in the column identified by colIdx.
- **ws.sheetName.rows\[rowIdx\]** - row object
- **ws.sheetName.lookup(lookupValue, lookupColumn, resultColumn)** - lookup a value in the lookupColumn and return the value from the resultColumn. The lookup column and result column can be either column names or column indices. When resultColumn is omitted the function will return the row object which can be further queried for the data.
- **json({object})** - convert an object to a JSON string.
- **obj({jsonString})** - convert a JSON string to an object.
- **lastResult** - the result of the last executed request.
- **lastError** - the error of the last executed request.
- **data.csv** - the original data set of the row when it was first imported. Imutable
- **data.labelName** - the data which has been last retrieved from Zabbix using a pull request. The labelName is configurable in the pull request dialog (see Augmenting data) and it defaults to **zbx**. Imutable

### Augmenting data

You can augment the data by pulling related data from Zabbix. To do this, access **Zabbix Ops-> Pull**

You will be presented with a dialog where you can select the Zabbix resource you want to pull and create the Zabbix API request template in the editor.

You can embed JavaScript code into the request template using the ${...} syntax. The JS code has access to the same variables as the JavaScript transformations (see above).

The template is evaluated each time you type something. The result of the compiled request against the data of the first selected row is displayed in the "Preview" section bellow the editor. If the preview backgroung is green, the request is valid and if the background is red, the request is invalid.

The request is executed for each **SELECTED and VISIBLE row** when you click the "Execute" button.

### Copy rows to different sheet

By accessing the table hamburger menu (top right) one can copy either the selected rows or all the visible rows to a new sheet

### Delete rows

By accessing the table hamburger menu (top right) one can delete either the selected rows or all the visible rows.

### Rename columns

Double click the column name to rename a column

### Rename worksheets

Double click the worksheet name to rename it.

### Reorder columns

Go to **Table ops->Reorder columns** to open a window where columns order can be changed using drag&drop

## Exporting data

### Exporting data to CSV

To export data to a CSV file, you need to click the "Export CSV" menu item in the Data menu. You will be presented with a dialog where you can select the rows to be exported.

### Exporting data to Zabbix

To export data to Zabbix, you need to click the "Export to Zabbix" menu item in the Zabbix Ops menu.

You will be presented with a dialog where you can select the Zabbix resource you want to export, the operation to be performed (create, update, delete) and the Zabbix API request template in the editor.

You can embed JavaScript code into the request template using the ${...} syntax. The JS code has access to the same variables as the JavaScript transformations (see above).

The template is evaluated each time the request changes using the data from the first selected row

A preview of the compiled request against the data of the first selected row is displayed in the "Preview" section bellow the editor. If the preview backgroung is green, the request is valid and if the background is red, the request is invalid.

The request is executed for each **selected row** when you click the "Execute" button. Currently, the request will be executed regardless if the preview is green or red.

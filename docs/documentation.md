

Introduction
------------

ZbxWizz is a tool that helps you to automate your Zabbix workflows.

It presents iself as a spreadsheet editor which is connected to the Zabbix API, allowing you to create, edit, and delete Zabbix objects.

How to use ZbxWizz
------------------
The typical workflow in working with ZbxWizz involves the following steps.

    
                            |------------------------|
                            | Edit current data set  |
                            |                        |
                            | ---------------------- |
    ------------------      | |   Manual editing   | |      |----------------|
    |  Import data   |      | ---------------------- |      |   Export data  |
    |      from      | ->   | ---------------------- |  ->  |       to       |
    | Zabbix/CSV/XLS |      | | JS transformations | |      | Zabbix/CSV/XLS |
    ------------------      | ---------------------- |      |----------------|
                            | ---------------------- |
                            | |    Augment data    | |
                            | ---------------------- |
                            |------------------------|
    

Configuring Zabbix connection
-----------------------------

To configure the connection to a Zabbix server, you need to click the on the Zabbix connection red icon in the top right corner of the screen.

You will be presented with a dialog where you can enter the Zabbix server URL and the API key and the API query mode.

There are 3 modes of API query:

*   sequential - in this mode, the API queries are executed sequentially, one after another. It's slower but it's more reliable since
*   parallel - in the mode all API requests are send at the same time. It is faster, but for write operations not recommended. From our experience, at least the inserts, can lead to data corruption in the database
*   hybrid - In this mode, the API queries ar executed in sequential batches of parallel requests. It's a good compromise between speed and reliability. Currently, the batch size is 10 requests, but we will add the ability to configure the batch size in the future.

The API key can be obtained from the Zabbix API documentation.

After entering the API key, click the "Save" button. The connection is saved in the browser's local storage, so it will be available in the same browser session.

The Zabbix connection icon is bright red when the connection is available and pale red when the connection is not available.

Importing data
--------------

### Importing data from CSV

To import data from a CSV file, you need to click the "Import CSV" button in the Data menu and select the file you want to import. You also need to select the target sheet where the data will be imported. The CSV file should have a header row with the column names.

### Importing data from XLS

To import data from an XLS file, you need to click the "Import XLS" button in the Data menu and select the file you want to import. Importing data from XLS is similar to importing data from CSV, but keep in mind that if there are any other sheets in the workspace, they will be deleted.

When importing data from XLS, you can also select the sheet which will be imported. By default, all sheets are imported.

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

*   worksheet.sheets.sheetName - the current cell value
*   worksheet.sheets.sheetName - the sheet object identified by the sheetName.
*   ws.sheetName.col(colIdx) - array containing all the values in the column identified by colIdx.
*   ws.sheetName.rows\[rowIdx\] - array containing all the values in the row identified by rowIdx.
*   ws.sheetName.lookup(lookupValue, lookupColumn, resultColumn) - lookup a value in the lookupColumn and return the value from the resultColumn.
*   json(object) - convert an object to a JSON string.
*   obj(jsonString) - convert a JSON string to an object.

Editing data
------------

### Filtering data

You can filter the data in the spreadsheet by clicking on the column index in the table header and using the filter form in the displayed menu dialog.

### Manual editing

Double click any cell to enter cell edit mode. Exiting the edit mode is done by pressing Ctrl+Enter or by clicking outside the cell.

### Row operations

You can add, remove and duplicate rows by clicking on the row index button and selecting of the "Insert empty row before", "Insert empty row after", "Delete row", and "Duplicate row" entries in the row context menu.

### JavaScript transformations

You can use JavaScript transformations to transform the data in the spreadsheet. To use JavaScript transformations, you need to click the "Column index" button in the table header of the column which you want to transform and select the transformation menu item.

You will be presented with a dialog where you can write small JavaScript snippets which must return a value.

The JS code has access to the following variables and functions:

*   self - the current cell value
*   $columnIndex - eg. $1, $2, $3, etc. - the index of the column
*   \_columnName - the name of the column
*   ws.sheetName - the sheet object identified by the sheetName.
*   ws.sheetName.col(colIdx) - array containing all the values in the column identified by colIdx.
*   ws.sheetName.rows\[rowIdx\] - array containing all the values in the row identified by rowIdx.
*   ws.sheetName.lookup(lookupValue, lookupColumn, resultColumn) - lookup a value in the lookupColumn and return the value from the resultColumn.
*   json(object) - convert an object to a JSON string.
*   obj(jsonString) - convert a JSON string to an object.
*   lastResult - the result of the last executed request.
*   lastError - the error of the last executed request.
*   data.csv - the original data set of the row when it was first imported. Imutable
*   data.labelName - the data which has been last retrieved from Zabbix using a pull request. The labelName is configurable in the pull request dialog (see Augmenting data) . Imutable

### Augmenting data

You can augment the data by pulling related data from Zabbix. To do this, you need to click the "Zabbix Ops" menu and select the Pull menu item.

You will be presented with a dialog where you can select the Zabbix resource you want to pull and create the Zabbix API request template in the editor.

You can embed JavaScript code into the request template using the ${...} syntax. The JS code has access to the same variables as the JavaScript transformations (see above).

The template is evaluated each time the request changes using the data from the first selected row

A preview of the compiled request against the data of the first selected row is displayed in the "Preview" section bellow the editor. If the preview backgroung is green, the request is valid and if the background is red, the request is invalid.

The request is executed for each **selected row** when you click the "Execute" button. Currently, the request will be executed regardless if the preview is green or red.

Exporting data
--------------

### Exporting data to CSV

To export data to a CSV file, you need to click the "Export CSV" menu item in the Data menu. You will be presented with a dialog where you can select the rows to be exported.

### Exporting data to Zabbix

To export data to Zabbix, you need to click the "Export to Zabbix" menu item in the Zabbix Ops menu.

You will be presented with a dialog where you can select the Zabbix resource you want to export, the operation to be performed (create, update, delete) and the Zabbix API request template in the editor.

You can embed JavaScript code into the request template using the ${...} syntax. The JS code has access to the same variables as the JavaScript transformations (see above).

The template is evaluated each time the request changes using the data from the first selected row

A preview of the compiled request against the data of the first selected row is displayed in the "Preview" section bellow the editor. If the preview backgroung is green, the request is valid and if the background is red, the request is invalid.

The request is executed for each **selected row** when you click the "Execute" button. Currently, the request will be executed regardless if the preview is green or red.

# ZbxWizz

ZbxWiz is an ETL (Extract-Transform-Load) type of tool which is target at Zabbix environments to assist in extracting configuration data from Zabbix (or CSV ), batch transforming the data using small JavaScript snippets and exporting the data either back to Zabbix or to CSV files.

## Usage
ZbxWiz consists of a web interface with a similar look with Excel, which is, data is presented in a table format.
By default the table has 30 columns. Imported data will populate the first x columns (depending on what is being imported) and the column names (in table head row 2) will be updated accordingly, while the remaining will be named colX (where X is the column number*).
* Column numbering starts from 0 (zero)
The table header containst 4 rows:
- row 1: displays the column number.  
- row 2: contains the column names.
- row 3: contains the filter form
- row 4: contains the transformation form

Also on the header, one can see a checkbox on the right side. Use this checkbox to select or unselect or the visible rows. 

### Filtering
Filtering form is pretty straight forward. Use the dropdown to select the filtering type and fill the text box with the wanted value. This input is not used when filtering type is either "Empty" or "Not empty"

Filters applied to multiple columns will be combined with AND, which means that only rows matching all column filters will be displayed


### Transformations
A transformation is a single line JavaScript snippet which is being executed on each **visible** cell of the column on which the transformation is performed.  

When creating the javascript expression, the following objects and functions are available:
- all JavaScript native objects and functions 
- custom utility functions 
- **cols** - an array which contains the values of all the cells of the current row in the order of appearance, that is cols[0] is the first data cell in the row.
- **flds** - is an JS object which holds all the cells in the row address by field name. 
- **self** - the current value of the cell being transformed (before transformation)
- **ws** - object containing all the worksheets in the current session. 
    
    ``Eg: ws.sheet1 will access the Datatable object attached to sheet1.``  

    
    
#### Datatable object
This is the data model of the sheets. It contains the following properties and methods:
#####  rows 
Array which contains all the row objects in the current sheet
##### cells
Multidimentional array ([rowNo][colNo]) containing all the cell objects in the current sheet
##### get_row(idx)
method returning the row number idx
##### col_by_num(idx)
returns an array containing all cell objects of column number idx
##### col_by_name(column_name) 
returns an array containing all the cell objects of column identified by column_name
##### lookup(subject,searchCol,valueCol,regexp=false)
returns the value from col valueCol (column index) from the first row where col identified by searchCol (either col index or col name) matches the regular expression subject
- subject: string for which to search. If regexp parameter is set to true, it will interpret the subject as a regular expression, either it will look for an exact match
- searchCol: string or integer reprezenting the column where to search
- valueCol: integere reprezenting the column number of the first matching row
- regexp: flag (default false) setting the way the subject is being interpreted (regepx vs equal values)

#### Row object
The row object is the data model for the row. It contains the following properties and methods
##### cells
Array containing all the cell object in the row. The array index is the column number
##### isHidden
read only property returning true if the row is hidden, false if visible
##### isSelected
read only property returning true if the row is selected, false if otherwise 
##### vals
Array containing all the cell values in the row. The array index is the column number
##### get_cell(idx)
Return the cell object identified by idx, where idx can be the column number or the column name
 
 


Transformation usage example:
``` 
    ws.sheet2.lookup(cols[1],1,0,true) -
```
 in this example, the lookup will search in sheet1 for the first cell in column 1 which is containing the value of col[1] in current sheet and it will return the value of cell[0] of the matching row
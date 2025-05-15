# ZbxWizz

**ZbxWizz** is a powerful and flexible web application for managing Zabbix configurations at scale. It allows you to **import, transform, export and update** Zabbix data using a spreadsheet-like interface, making complex bulk operations simple and error-free.

## Key Features

- Intuitive Spreadsheet Interface: Work with multiple worksheets while enjoying familiar functionality like sorting, filtering, cell editing, and column management
- Powerful Data Transformation: Leverage JavaScript expressions to transform data at the column level with ease
- Flexible Data Integration: Import data seamlessly from CSV, XLS files or directly from Zabbix via API<!--  -->
- Export Capabilities: Export your worksheets to CSV format (Excel export coming soon!)
- Enhanced Zabbix Integration:
  - Enrich your data by pulling additional information from Zabbix using API request templates
  - Perform CRUD operations on Zabbix resources directly from your worksheet data
- Advanced Scripting: Built-in script editor with full access to the ZbxWizz API for complex automation scenarios
- Efficient Data Management:
  - Create new worksheets from selected or visible rows
  - Automatic saving to localStorage (5MB limit per session - IndexedDB implementation in progress for expanded storage)
- Environment Portability: Export and import your complete work environment as JSON files for seamless workflow continuity

## Security

ZbxWizz operates entirely client-side - all data is stored locally on your machine and never leaves your system. Your sensitive information remains under your complete control.

## Usage

Clone the repository on your machine and open the `index.html` file with your browser. A local web server is not required, but you can use one if you want.

You will also need to disable CORS. Depending on the browser, you should consider installing and extension to disable CORS.

An Electron version and a Zabbix module are in the making, so stay tuned by subscribing to our newsletter (https://zbxwizz.app).

## Documentation

The documentation is available [here](docs/documentation.md).

## License

[MIT](LICENSE.md)

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## Contact

[email](mailto:support@zbxwizz.app)

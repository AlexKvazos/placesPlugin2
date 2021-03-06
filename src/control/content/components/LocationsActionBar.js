import React from 'react';
import csv from 'csv-js';
import CSVjs from 'comma-separated-values';

class LocationsActionBar extends React.Component {

  onAddLocation() {
    this.props.onAddLocation();
  }

  onAddLocationCancel() {
    this.props.onAddLocationCancel();
  }

  onFileChange() {
    const file = this.fileInput.files[0];
    const reader = new FileReader();
    reader.onload = e => {
      const rows = csv.parse(e.target.result);

      // Remove header contents
      rows.splice(0, 1);

      const locations = rows.map(row => ({
        title: row[0],
        address: {
          name: row[1],
          lat: parseFloat(row[2]),
          lng: parseFloat(row[3])
        },
        description: row[4],
        subtitle: row[5],
        image: row[6]
      }));
      this.props.onMultipleSubmit(locations);
    };
    reader.onerror = e => console.error('Error reading csv');
    reader.readAsText(file, 'UTF-8');
  }

  handleDataExport() {
    const rows = [];
    this.props.places.forEach(place => {
      rows.push({
        title: place.title,
        address: place.address.name,
        lat: place.address.lat,
        lng: place.address.lng,
        description: place.description || '',
        subtitle: place.subtitle || '',
        image: place.image || ''
      });
    });

    let csvContent = 'data:text/csv;charset=utf-8,';
    let encoded = new CSVjs(rows, { header: true }).encode();
    csvContent += encoded;


    const encodedURI = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedURI);
    link.setAttribute('download', 'places_export.csv');
    document.body.appendChild(link);
    link.click();
  }

  handleTemplateDownload() {
    const rows = [['name','address_name','address_lat','address_lng','description', 'subtitle', 'image']];
    let csvContent  = 'data:text/csv;charset=utf-8,';
    rows.forEach(row => csvContent += row.join(',') + '\r\n');

    const encodedURI = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedURI);
    link.setAttribute('download', 'places_template.csv');
    document.body.appendChild(link);
    link.click();
  }

  render() {
    const { addingLocation } = this.props;

    return (
      <div>
        <div className='row'>
          <div className='col-xs-4'>
            <div className='button-group'>
              { addingLocation ? (
                <button
                  className='btn btn-danger'
                  onClick={ () => this.onAddLocationCancel() }>
                  Cancel
                </button>
              ) : (
                <button
                  className='btn btn-success'
                  onClick={ () => this.onAddLocation() }>
                  Add Location
                </button>
              ) }
            </div>
          </div>
          <div className='col-xs-8'>
            <input
              onChange={ () => this.onFileChange() }
              ref={ n => this.fileInput = n }
              type='file'
              id='csv'
              accept='.csv' />
            <div className='button-group right'>
              <label
                className='btn btn-success'
                htmlFor='csv'>
                Import CSV
              </label>
              <button
                onClick={ () => this.handleDataExport() }
                className='btn btn-primary template'>
                Export CSV
              </button>
              <button
                onClick={ this.handleTemplateDownload }
                className='btn btn-primary template'>
                CSV Template
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default LocationsActionBar;

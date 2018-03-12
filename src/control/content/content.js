import buildfire from 'buildfire';
import React from 'react';
import debounce from './lib/debounce';
import uuidv4 from './lib/uuidv4';
import LocationsActionBar from './components/LocationsActionBar';
import LocationList from './components/LocationList';
import CategoriesList from './components/CategoriesList';
import AddLocation from './components/AddLocation';
import EditLocation from './components/EditLocation';

class Content extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: {},
      addingLocation: false,
      editingLocation: false
    };
  }

  componentWillMount() {
    buildfire.datastore.get('places', (err, result) => {
      if (err) return console.error(err);

      // we migrate old storage format to new one if needed
      if (result.data.places && result.data.places.length) {
        this.setState({ data: { categories: result.data.categories } });
        this.migrate(result.data.places);
      } else {
        this.setState({ data: result.data });
      }
    });

    this.getPlacesList();
  }

  migrate(places) {
    // Clear original data.places without mutating state
    const data = Object.assign({}, this.state.data);
    data.places = [];
    this.setState({ data });
    this.handleSave();

    console.warn('Migrating');

    // Insert data to new format
    buildfire.datastore.bulkInsert(places, 'places-list', (err, data) => {
      if (err) return console.error(err);
      this.getPlacesList();
    });
  }

  getPlacesList() {
    buildfire.datastore.search({}, 'places-list', (err, result) => {
      if (err) return console.error(err);
      const data = Object.assign({}, this.state.data);
      data.places = result.map(place => {
        place.data.id = place.id;
        return place.data;
      });
      this.setState({ data });
    });
  }

  /**
   * Handle state saving to the datastore
   */
  handleSave = debounce(() => {
    // Do not save places list on simple datastore or we run out of space
    const dataClone = Object.assign({}, this.state.data);
    delete dataClone.places;

    buildfire.datastore.save(dataClone, 'places', (err) => {
      if (err) console.error(err);
    });
  }, 600)

  updateSort(list) {
    const { data } = this.state;
    data.places = list;
    this.setState({ data });
    this.handleSave();
  }

  /**
   * Handle a deletion of a location index
   *
   * @param   {Number} index Location index on places array
   */
  handleLocationDelete(index) {
    const { data } = this.state;
    let [place] = data.places.splice(index, 1);
    this.setState({ data });

    buildfire.datastore.delete(place.id, 'places-list', (err) => {
      if (err) return console.error(err);
    });
  }

  handleLocationEdit(index) {
    this.setState({ editingLocation: index });
  }

  /**
   * Handle a deletion of a category index
   *
   * @param   {Number} index Location index on places array
   */
  handleCategoryDelete(index) {
    let { data } = this.state;
    data.categories = data.categories || [];
    data.categories.splice(index, 1);
    this.setState({ data });
    this.handleSave();
  }

  /**
   * Handle renaming a category
   *
   * @param   {Number} index   The category index in the array
   * @param   {String} newName The new category name to use
   */
  handleCategoryRename(index, newName) {
    let { data } = this.state;
    console.log(data.categories, index, newName);
    data.categories[index].name = newName;
    this.setState({ data });
    this.handleSave();
  }

  /**
   * Handle a location submission and save to datastore
   *
   * @param   {Object} location Location object
   */
  onLocationSubmit(location) {
    const { data } = this.state;
    data.places = data.places || [];

    buildfire.datastore.insert(location, 'places-list', (err, result) => {
      if (err) return console.error(err);
        result.data.id = result.id;
        data.places.push(result.data);
        this.setState({ data });
    });

    this.setState({ addingLocation: false });
  }

  /**
   * Handle a location submission of an existing location
   *
   * @param   {Object} location Location data
   * @param   {Number} index    Array index of editing location
   */
  onLocationEdit(location, index) {
    const { data } = this.state;
    data.places = data.places || [];
    data.places[index] = location;
    this.setState({ data, editingLocation: false });
    this.handleSave();
  }

  /**
   * Handle multiple location submissions (such as csv imports)
   *
   * @param   {Object} locations Locations array
   */
  onMultipleLocationSubmit(locations) {
    const { data} = this.state;
    data.places = data.places || [];
    locations.forEach(location => data.places.push(location));
    this.setState({ data, addingLocation: false });
    this.handleSave();
  }

  /**
   * Handle category submission
   *
   * @param   {String} category Category name
   */
  onCategorySubmit(categoryName) {
    categoryName = categoryName.trim();
    if (!categoryName.length) return;

    let category = {
      id: uuidv4(),
      name: categoryName
    };

    const { data } = this.state;
    data.categories = data.categories || [];
    data.categories.push(category);
    this.setState({ data });
    this.handleSave();
  }

  onAddLocation() {
    this.setState({ addingLocation: true });
  }

  onAddLocationCancel() {
    this.setState({
      addingLocation: false,
      editingLocation: false
    });
  }

  render() {
    const { data, addingLocation, editingLocation } = this.state;

    return (
      <div>
        <div className='row category-box'>
          <CategoriesList
            categories={ data.categories }
            handleRename={ (index, newName) => this.handleCategoryRename(index, newName) }
            handleDelete={ (index) => this.handleCategoryDelete(index) }
            onSubmit={ (category) => this.onCategorySubmit(category) } />
        </div>
        <div className='row'>
          <div className='col-xs-12'>
            <LocationsActionBar
              places={ data.places }
              addingLocation={ addingLocation || editingLocation !== false }
              onAddLocation={ () => this.onAddLocation() }
              onAddLocationCancel={ () => this.onAddLocationCancel() }
              onMultipleSubmit={ (locations) => this.onMultipleLocationSubmit(locations) } />

            { addingLocation || editingLocation !== false
                ? addingLocation
                  ? <AddLocation
                      categories={ data.categories }
                      onSubmit={ location => this.onLocationSubmit(location) } />
                  : <EditLocation
                      categories={ data.categories }
                      location={ data.places[editingLocation] }
                      onSubmit={ location => this.onLocationEdit(location, editingLocation) }/>
                : <LocationList
                    places={ data.places }
                    updateSort={ (list) => this.updateSort(list) }
                    handleEdit={ (index) => this.handleLocationEdit(index) }
                    handleDelete={ (index) => this.handleLocationDelete(index) }/> }
          </div>
        </div>
      </div>
    );
  }
}

export default Content;

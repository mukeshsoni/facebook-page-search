'use strict';
/*global utils */

var app = (function(window, document) {
  var searchResults = [], resultsContainer, searchInputBox, lastSearchText, pageSearchDetailsCache = {};
  var accessToken = '';

  function getJSONP(url, callback) {
    var script = document.createElement('script');

    // neat trick to maintain global references to callback functions. Remember the functions is called in the global scope
    var randomFuncName = 'OurRand'+Math.floor(Math.random()*1110001);
    window[randomFuncName] = callback;

    script.src = url+'&callback='+randomFuncName;
    document.body.appendChild(script);
  }

  function toggleFavorite(pageId) {
    if(localStorage.getItem(pageId)) {
      localStorage.removeItem(pageId);
    } else {
      localStorage.setItem(pageId, true);
    }
  }

  // If the page with page-id pageId is user's favorite
  // Storing the favorites in localStorage so that a page refresh doesn't destroy them
  function isFavorite(pageId) {
    return localStorage.getItem(pageId);
  }

  // sort by the field name. E.g. by "name", "category" etc.
  function sortResultsBy(fieldName, sortOrder) {
    sortOrder = sortOrder || 1; // set the default sort order as ascending

    searchResults.sort(function(a, b) {
      return a[fieldName].localeCompare(b[fieldName])*sortOrder;
    });

    return searchResults;
  }

  function getSortField() {
    return document.querySelector('input[name="sortField"]:checked').value;
  }

  function getSortOrder() {
    return document.querySelector('input[name="sortOrder"]:checked').value === 'ascending' ? 1 : -1;
  }

  function showMessage(message, level) {
    level = level || 'message';

    var warningBox = document.querySelector('#message-box');
    warningBox.className = level;
    warningBox.innerHTML = message;
  }

  function updateResultsCount(count) {
    document.getElementById('results-count').innerHTML = count;
  }

  function hideResultArea() {
    // resultsContainer.style.display = 'none';
    resultsContainer.style.visibility = 'hidden';
    helper.removeClass(document.getElementById('results'), 'active');
  }

  function showResultArea() {
    // resultsContainer.style.display = 'block';
    resultsContainer.style.visibility = 'visible';
    helper.addClass(document.getElementById('results'), 'active');
  }

  function toggleFavoriteClass(element) {
    if(element.className.indexOf('unfavorite') >= 0) {
      helper.removeClass(element, 'unfavorite');
      helper.addClass(element, 'favorite');
    } else {
      helper.removeClass(element, 'favorite');
      helper.addClass(element, 'unfavorite');
    }
  }

  function getAccessToken() {
    return localStorage.getItem('accessToken');
    // return accessToken;
  }

  function searchPages(searchText, accessToken, callback) {
    if(!searchText || typeof searchText !== 'string' || searchText.replace(/^\s+|\s+$/g,'') === '') {
      throw 'Invalid input for searchText';
    }

    var url = 'https://graph.facebook.com/search?q='+encodeURIComponent(searchText)+'&type=page&access_token='+accessToken;
    getJSONP(url, callback);
  }

  function getPageDetails(pageId, accessToken, callback) {
    // check is cache first
    if(!pageSearchDetailsCache[pageId]) {
      var url = 'https://graph.facebook.com/'+encodeURIComponent(pageId)+'?access_token='+accessToken;
      getJSONP(url, callback);
    } else {
      callback(pageSearchDetailsCache[pageId]);
    }
  }

  function validateInput(input) {
    if(input.replace(/^\s+|\s+$/g,'') === '') {
      return false;
    }

    return true;
  }

  function getInputError(input) {
    if(input.replace(/^\s+|\s+$/g,'') === '') {
      return 'Cannot work on empty input';
    }

    return '';
  }

  function setFocusOnSearchBox() {
    document.getElementById('search-text').focus();
  }
  /*
   * Utility functions to create DOM elements for table columns
   */
  var helper = {
    addClass: function(element, className) {
      if(typeof element !== 'undefined' && element) {
        element.className = element.className.replace(/^\s+|\s+$/g,'') + ' ' + className;
      }
    },

    removeClass: function(element, className) {
      var re = new RegExp(className, 'i');
      if(typeof element !== 'undefined' && element) {
        element.className = element.className.replace(re,'');
      }
    },

    getNewListItemWith: function(propertyName, propertyValue) {
      var liNode = [
        'li', {}, [
          ['p', {}, [
            utils.capitaliseFirstLetter(propertyName) + ': ',
            ['b', {}, [utils.capitaliseFirstLetter(propertyValue)]]
          ]]
        ]
      ];

      // utils.createDOMNode is pretty sweet. Almost like coke.
      return utils.createDOMNode(liNode);
    },

    getNewFavoriteButton: function(options) {
      options = options || {className: ''};
      options.className += ' star';
      options.title = 'Favorite this page';

      return utils.createDOMNode('button', options, ['']);
    }
  };

  function getDetailsElement(pageId) {
    return document.querySelector('summary[data-pageid="'+pageId+'"]');
  }

  function appendPageDetails(element, pageDetails) {
    var tempElement = element;

    if(!element) {
      return;
    }

    // check if details div is already attached somewhere. If yes, don't do anything
    while(tempElement) {
      if(tempElement.nextSibling && tempElement.nextSibling.className === 'details-div') {
        return;
      }

      tempElement = tempElement.nextSibling;
    }

    var detailsDivNode = document.createElement('div');
    detailsDivNode.className = 'details-div';
    var propertyTextNode;
    var pNode;

    Object.keys(pageDetails).forEach(function(pageDetailName) {
      // No need to show 'id' and 'cover' (an image) attributes
      if(pageDetailName !== 'id' && pageDetailName !== 'cover') {
        if(pageDetailName === 'link' || pageDetailName === 'website') {
          propertyTextNode = utils.createDOMNode(['a', {target: '_blank', href: pageDetails[pageDetailName]}, [pageDetails[pageDetailName]]]);
        } else {
          propertyTextNode = document.createTextNode(pageDetails[pageDetailName]);
        }

        var pNodeStructure = [
          'p', {}, [
            ['b', {}, [utils.capitaliseFirstLetter(pageDetailName)]],
            ': ',
            propertyTextNode
          ]
        ];

        pNode = utils.createDOMNode(pNodeStructure);
        detailsDivNode.appendChild(pNode);
      }
    });

    element.parentNode.appendChild(detailsDivNode);
  }

  function showPageDetails(response) {
    if(!response) {
      return showMessage('Couldn\'t get details from facebook. Please try later', 'warning');
    }

    if(response && response.error) {
      // if(response.error.message.indexOf('Invalid OAuth access token') >= 0) {
      localStorage.removeItem('accessToken');
      // }

      return showMessage('Error getting data from facebook: ' + response.error.message, 'error');
    }

    pageSearchDetailsCache[response.id] = response; // cache the result so as to avoid round trip if requested again
    appendPageDetails(getDetailsElement(response.id), response);
  }

  function getResultContainer() {
    return resultsContainer;
  }

  function populateList(results) {
    var resultsList = document.getElementById('results');
    if(resultsList) {
      resultsList.parentNode.removeChild(resultsList);
    }

    resultsList = document.createElement('ul');
    resultsList.id = 'results';


    results.forEach(function(result) {
      var favoriteButton = helper.getNewFavoriteButton({className: isFavorite(result.id) ? 'favorite' : 'unfavorite', 'data-pageid': result.id});

      var resultRowStructure = [
        'li', {className: 'result-row'}, [
          ['ul', {}, [
            favoriteButton, helper.getNewListItemWith('name', result.name), helper.getNewListItemWith('category', result.category),
            ['details', {} , [
              ['summary', {title: 'View details', 'data-pageid': result.id, className: 'page-details'}, ['Details']]
            ]]
          ]]
        ]
      ];

      resultsList.appendChild(utils.createDOMNode(resultRowStructure));
    });

    getResultContainer().appendChild(resultsList);
  }

  /*
   * Event Handlers
   */

  // the callback for handling the jsonp response from facebook search api
  function handleSortClick() {
    sortResultsBy(getSortField(), getSortOrder());
    displayResults(searchResults);
  }

  // this funcion is passed as a callback to facebook jsonp api for searching pages
  function handlePageSearchResults(response) {
    if(response && response.error) {
      // if(response.error.message.indexOf('Invalid OAuth access token') >= 0) {
        localStorage.removeItem('accessToken');
      // }

      showMessage('Facebook api error: ' + response.error.message, 'error');
      return console.log('Error getting data from facebook: ' + response.error.message);
    }

    if(!response.data) {
      showMessage('Couldn\'t get data from facebook. Please try later', 'error');
      return console.log('Couldn\'t get data from facebook. Please try later');
    }

    searchResults = response.data;
    displayResults(sortResultsBy(getSortField(), getSortOrder()));
  }

  // self explantory
  function handleSearchClick() {
    if(!utils.isOnline()) {
      showMessage('You don\'t seem to have internet connection', 'error');
    }

    if(!validateInput(searchInputBox.value)) {
      showMessage(getInputError(searchInputBox.value), 'error');
    } else {
      // minor optimisation: if the text in the search box has not changed, we don't need to sent a network request again
      if(lastSearchText !== searchInputBox.value) {
        lastSearchText = searchInputBox.value;
        searchPages(lastSearchText, getAccessToken(), handlePageSearchResults);
      }
    }
  }

  // If the user presses 'Enter' in the search box
  function handleSearchKeydown(event) {
    if((event.keyCode && event.keyCode === 13) || (event.which && event.which === 13)) {
      handleSearchClick();
    }
  }

  // handle click on the 'details' button
  function handleDetailsClick(element) {
    if(!utils.isOnline()) {
      showMessage('You don\'t seem to have internet connection', 'error');
    }

    getPageDetails(element.getAttribute('data-pageid'), getAccessToken(), showPageDetails);
  }

  // handle click on the favorite button
  function handleFavoriteClick(event) {
    var pageId = event.target.getAttribute('data-pageid');
    toggleFavorite(pageId);
    toggleFavoriteClass(event.target);
  }

  // event delegation to results container. Handles clicks from favorite button and details button
  function handleContainerClick(event) {
    if(event.target && event.target.className.indexOf('favorite') >= 0) {
      handleFavoriteClick(event);
    }

    // only make the request when the details tab going from closed to open state
    if(event.target && event.target.className === 'page-details' && event.target.parentNode && !event.target.parentNode.open) {
      handleDetailsClick(event.target);
    }
  }

  // Show the results in a beautiful table. Kidding, tables are never beautiful. Atleast i can't make one
  function displayResults(results) {
    if(results.length === 0) {
      hideResultArea();
      showMessage('Query fetched zero results', 'warning');
      return;
    }

    populateList(results);
    updateResultsCount(searchResults.length);
    showMessage('');
    showResultArea();
  }

  return {
    initialize: function() {
      searchInputBox = document.getElementById('search-text');
      resultsContainer = document.getElementById('results-container');

      hideResultArea();
      searchInputBox.addEventListener('keydown', handleSearchKeydown);

      // TODO: don't know if clearing the results is the right behavior when the cross in search field is clicked to clear search box
      // i think the results should stay put
      searchInputBox.addEventListener('search', function(event) {
        if(event.target.value === '') {
          // hideResultArea();
        }
      });

      // Delegating the clicks on details and favorite button within table cells to the table itself
      document.getElementById('results-container').addEventListener('click', handleContainerClick);

      document.getElementById('search-button').addEventListener('click', handleSearchClick);

      document.getElementById('search-container').addEventListener('click', function(event) {
        if(event.target.name === 'sortField' || event.target.name === 'sortOrder') {
          handleSortClick(event);
        }
      });

      searchInputBox.value = 'pepsip';
      setFocusOnSearchBox();

      if(!localStorage.getItem('accessToken')) {
        accessToken = prompt('Need facebook access token');
        localStorage.setItem('accessToken', accessToken);
      } else {
        accessToken = localStorage.getItem('accessToken');
      }
    }
  };
}) (window, document);

window.onload = function() {
  app.initialize();
};

/* TODO
  - clear all traces of TODOs before sumitting. Yup, adding that in TODO list is not ironic.
  - Error handling
    - what if no internet connection
    - what about errors from facebook?
*/

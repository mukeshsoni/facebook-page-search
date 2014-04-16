'use strict';

/*jshint unused: true */
var utils = (function() {
    
  return {
    isArray: function(a) {
      return Object.prototype.toString.call(a) === '[object Array]';
    },

    isOnline: function() {
      return navigator && navigator.onLine;
    },

    appendChildren: function(element, child) {
      if(child instanceof Node) { // Probably not the best way to check if the object is a DOM Node type
        element.appendChild(child);
      } else if(typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else {
        element.appendChild(this.createDOMNode(child));
      }

      return element;
    },

    capitaliseFirstLetter: function(string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
    },

    /*
    * An abstraction over document.createElement which takes
    * tag - the tag to be created
    * attributes - attributes of the tag like class, href, src etc
    * children - kids to be appended to this tag. It's done recursively, so go deep to your heart's content
    */
    createDOMNode: function(tag, attributes, children) {
      if(!tag) {
        return document.createTextNode('');
      }

      if(this.isArray(tag)) {
        return this.createDOMNode.apply(this, tag);
      }

      var el = document.createElement(tag);
      for(var attr in attributes) {
        switch(attr) {
          case 'className':
          case 'class': // some people might send across 'class' instead of className. Makes sense. Just because ES6/7 will have classes, why can't property names be class?
          case 'id':
            el[attr] = attributes[attr];
            break;
          default:
            el.setAttribute(attr, attributes[attr]);
        }
      }

      if(children && this.isArray(children)) {
        var self = this;
        children.forEach(function(child) {
          el = self.appendChildren(el, child);
        });
      }

      return el;
    }
  };
})();
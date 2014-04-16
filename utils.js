'use strict';

var utils = (function() {
    
  return {
    isArray: function(a) {
      return Object.prototype.toString.call(a) === '[object Array]';
    },

    appendChildren: function(element, child) {
      if(child instanceof Node) {
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
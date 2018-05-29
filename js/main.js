'use strict';

const development = true;
const toString = Object.prototype.toString;
const regObj = RegExp('object', 'g');
const isObject = thing => {
	!!development && console.log('is it an object: ', regObj.test(toString.call(thing)));
	return regObj.test(toString.call(thing));
};
const deleteNull = obj => {
	!!development && console.log('in deleteNull with: ', obj);
	if (isObject(obj)) {
		var newObj = {};
		Object.entries(obj).forEach(([key, value]) => {
			if (obj.hasOwnProperty(key) && value && value !== null) {
				newObj[key] = value;
			}
		});
		!!development && console.log(`done deleting null. returning this ${newObj}`);
		return newObj;
	} else {
		return obj;
	}
};

const Ajax = {
	getJson: function(where) {
		return $.getJSON(where).done(function(json) {
			return json;
		}).fail(function(err) {
			!!development && console.error('failed ajax getjson. heres error: ', err);
			return err;
		});
	},
	postIt: function(where, what) {
		return $.post(where, what).done(function(response) {
			return response;
		}).fail(function(err) {
			!!development && console.error('failed json post. heres error: ', err);
			return error;
		});
	}
};

class Product {
	constructor(_product) {
		for (const [key, value] of Object.entries(_product)) {
			this[key] = value;
		}
		this.isDisplayed = false;
	}
}

class ProductList {
	constructor(where, _products) {
		this.initialView = true;
		this.list = where;
		this.products = [];
		this.dismissed = [];
		this.purchased = [];
		this.productTypes = [];
		this.city = null;
		this.state = null;

		this.products = _products;

		for (var i = 0; i < this.products.length; i++) {
			var product = this.products[i];
			if (product.type.name && product.type.name.length && !this.productTypes.includes(product.type.name)) {
				this.productTypes.push(product.type.name);
			}

			if (!this.city && product.locations[0].city && product.locations[0].city.length) {
				this.city = product.locations[0].city;
			}

			if (!this.state && product.locations[0].region && product.locations[0].region.length) {
				this.state = product.locations[0].region;
			}
		}
	}
}

var App = (function() {
	var self,
		localProducts = [],
		hereProducts,
		$card1 = $('#card-1'),
		$card2 = $('#card-2'),
		$card3 = $('#card-3');

	return {
		init: function() {
			self = this;
			self.getLocalProducts()
				.then(self.createLocalProducts)
				.then(self.createLocalListOfProducts)
				.then(self.nameTheCity)
				.then(self.listTheTypes)
				.then(self.fillTheCards)
				.then(self.bindings)
				.catch(err => {
					!!development && console.error('failed to get portland products because: ', err);
				});
		},
		getLocalProducts: function() {
			return Ajax.getJson('data/complete-portland-curated.json').then(results => {
				return results.products;
			});
		},
		createLocalProducts: function(_products) {
			return new Promise((resolve, reject) => {
				_products.forEach(product => {
					let p = new Product(product);
					localProducts.push(p);
				});
				resolve();
			});
		},
		createLocalListOfProducts: function() {
			return new Promise((resolve, reject) => {
				hereProducts = new ProductList('here', localProducts);
				!!development && console.log('hereProducts: ', hereProducts);
				resolve();
			});
		},
		nameTheCity: function() {
			$('.results-city').empty().text(`${hereProducts.city}, ${hereProducts.state}`);
		},
		listTheTypes: function() {
			return new Promise((resolve, reject) => {
				var pts = [];
				$('#product-types').empty();
				hereProducts.productTypes.forEach(pType => {
					pts.push(`<button class="product-type">${pType}</button>`);
				});
				if (pts.length) {
					$('#product-types').append(pts.join(''));
				}
				resolve();
			});
		},
		fillTheCards: function() {
			return new Promise((resolve, reject) => {
				for (var i = 0; i < 3; i++) {
					var id = i + 1,
						$card = $(`#card-${id}`),
						$typeName = $card.find('.product-type-name'),
						$productName = $card.find('.product-name'),
						$theImage = $card.find('img');

					!!development && console.log('hereProducts.products[i].type.name: ', hereProducts.products[i].type.name);
					!!development && console.log('hereProducts.products[i].details.name: ', hereProducts.products[i].details.name);
					!!development && console.log('hereProducts.products[i].images[0].url: ', hereProducts.products[i].images[0].url);

					hereProducts.products[i].isDisplayed = true;

					$typeName.empty().text(hereProducts.products[i].type.name);
					$productName.empty().text(hereProducts.products[i].details.name);
					$theImage.attr('src', hereProducts.products[i].images[0].url);
					$card.data('productInfo', hereProducts.products[i]);
				}
				resolve();
			});
		},
		animateCardDown: function(cardId) {
			!!development && console.log('in animateCardDown: ', cardId);
			return new Promise((resolve, reject) => {
				$(`#${cardId}`).animate({
					top: "+=600"
				}, 1000, function() {
					resolve();
				});
			});
		},
		dismissProduct: function(product) {
			!!development && console.log('in dismissProduct: ', product);
			return new Promise((resolve, reject) => {
				var toDismiss = hereProducts.products.findIndex(function(prod) {
						return prod.uuid === product.uuid;
					}),
					nextProductIndex = toDismiss;
				hereProducts.products.splice(toDismiss, 1);
				hereProducts.dismissed.push(product);
				resolve(nextProductIndex);
			});
		},
		getNewProductInfo: function(newIndex) {
			!!development && console.log('in getNewProductInfo: ', newIndex);
			return new Promise((resolve, reject) => {
				resolve(hereProducts.products[newIndex]);
			});
		},
		handleCardSwap: function(cardId) {
			!!development && console.log('in handleCardSwap: ', cardId);
			var $card = $(`#${cardId}`),
				product = $card.data('productInfo');

			self.animateCardDown(cardId)
				.then(self.dismissProduct(product))
				.then(self.getNewProductInfo)
				.then(newProduct => {
					!!development && console.log('newProduct: ', newProduct);
					$card.data('productInfo', newProduct);
					$card.find('.product-type-name').empty().text(newProduct.type.name);
					$card.find('.product-name').empty().text(newProduct.details.name);
					$card.find('img').attr('src', newProduct.images[0].url);
				});
		},
		bindings: function() {
			$('.close-icon').off('click').on('click', function(e) {
				!!development && console.log('correct click');
				e.stopPropagation();
				e.preventDefault();
				var $me = $(e.target).closest('article'),
					cardNumber = $me.attr('id');
				self.handleCardSwap(cardNumber);
			});

			$('button').not('.close-icon').off('click').on('click', function(e) {
				!!development && console.warn('FAIL!');
				e.stopPropagation();
				e.preventDefault();
				var $me = $(e.target),
					ns = $me.data('subject'),
					method = $me.data('predicate'),
					thing = $me.data('object');

				!!development && console.log(`${ns}.${method}(${object})`);
				self[ns][method](thing);
			});
		}
	};
}());

$(function() {
	App.init();
});
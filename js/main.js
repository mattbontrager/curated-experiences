'use strict';

/**
 * TODO: create service worker for products
 */


const development = true;
const toString = Object.prototype.toString;
const regObj = RegExp('object', 'g');

/**
 * an object containing helper methods to calculate times, dates, durations, etc.
 * @type {Object}
 */
const Times = {
	getDateInfo: function getDateInfo() {
		!!development && console.log('in getDateInfo');
		var startingYear = 1960,
			numOfYears = 100,
			y = [];

		y.push(startingYear);

		for (let i = 0; i < numOfYears; i++) {
			y.push(startingYear++);
		}

		return {
			days: moment().daysInMonth(),
			months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'],
			years: y
		};
	},
	nearestHalfHour: function nearestHalfHour() {
		!!development && console.log('in nearestHalfHour');
		var rounding = 30 * 60 * 1000,
			now = moment(),
			start;

		return moment(Math.ceil((+now) / rounding) * rounding);
	},
	hoursUntilMidnight: function hoursUntilMidnight() {
		!!development && console.log('in hoursUntilMidnight');
		var midnight = new Date(),
			hoursUntil;

		midnight.setHours(24);
		midnight.setMinutes(0);
		midnight.setSeconds(0);
		midnight.setMilliseconds(0);

		hoursUntil = (midnight.getTime() - new Date().getTime() ) / 1000 / 60 / 60;
		!!development && console.log('hoursUntil: ', parseInt(hoursUntil, 10));

		return parseInt(hoursUntil, 10);
	},
	get: function getTimes() {
		!!development && console.log('in getTimes');
		var now = moment(),
			hoursLeftInTheDay = this.hoursUntilMidnight(),
			halfHoursLeft = ((hoursLeftInTheDay * 2) > 4) ? 4: hoursLeftInTheDay * 2,
			defaultFrom = now.format("YYYY-MM-DD"),
			plusTomorrow = moment().add(1, 'days'),
			plusOneWeek = moment().add(7, 'days'),
			plusThirtyMinutes = now.add(30, 'minutes'),
			defaultTo = plusOneWeek.format("YYYY-MM-DD"),
			nearestHalfHour = this.nearestHalfHour(),
			availabilities = [],
			availabilityDates = [],
			availabilityTimes = [],
			availabilityDateFrom = now.format("DD MMM YY"),
			availabilityTimeFrom = nearestHalfHour.format("hh mm A"),
			i = 0,
			j = 0,
			d = 3;

		console.log('halfHoursLeft: ', halfHoursLeft);

		availabilityDates.push(availabilityDateFrom);
		availabilityTimes.push(availabilityTimeFrom);

		for (; i < d; i++) {
			var addDay = now.add(1, 'days');
			availabilityDates.push(addDay.format("DD MMM YY"));
		}

		for (; j < halfHoursLeft; j++) {
			var addTime = nearestHalfHour.add(30, 'minutes')
			availabilityTimes.push(addTime.format("hh mm A"));
		}

		availabilities.dates = availabilityDates;
		availabilities.times = availabilityTimes;

		!!development && console.log('availabilities: ', availabilities);


		return {
			from: defaultFrom,
			to: defaultTo,
			availabilities: availabilities
		};
	}
};

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
		this._position = 0;
		for (const [key, value] of Object.entries(_product)) {
			this[key] = value;
		}
		this.isDisplayed = false;
	}
	get position() {
		return this._position;
	}
	set position(pos) {
		this._position = pos;
		return this._position;
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

		if (this.products.length) {
			this.products.forEach(product => {
				if (product.type.name && product.type.name.length && !this.productTypes.includes(product.type.name)) {
					this.productTypes.push(product.type.name);
				}

				if (!this.city && product.locations[0].city && product.locations[0].city.length) {
					this.city = product.locations[0].city;
				}

				if (!this.state && product.locations[0].region && product.locations[0].region.length) {
					this.state = product.locations[0].region;
				}
			});
		}
	}
}

const productCardFactory = product => {
	!!development && console.log('in productCardFactory with: ', product);
	return `
		<product-card class="product-card" position="${product.position}" productid="${product.uuid}">
			<span slot="product-type-name">${product.type.name}</span>
			<div class="close-icon" slot="close-button"></div>
			<span slot="product-name">${product.details.name}</span>
			<img slot="product-image" src="${product.images[0].url}">
		</product-card>
	`;
};

const productDetailFactory = product => {
	return `
		<product-detail-card class="product-detail-card" productid="${product.uuid}"></product-detail-card>
	`;
};

var App = (function() {
	var self, localProducts = [], hereProducts,
		$checkButton = $('.item-availability-check-button'),
		$purchaseButton = $('.add-to-itinerary-button');

	return {
		where: null, // either here, there, or custom
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
		getLocalProducts: () => {
			return Ajax.getJson('data/complete-portland-curated.json').then(results => {
				return results.products;
			});
		},
		createLocalProducts: (products) => {
			return new Promise((resolve, reject) => {
				let i = 1;
				products.forEach(product => {
					let p = new Product(product);
					let pos = (i % 3 === 0) ? 3: i % 3;
					p.position = pos;
					localProducts.push(p);
					i++;
				});
				resolve();
			});
		},
		createLocalListOfProducts: () => {
			return new Promise((resolve, reject) => {
				hereProducts = new ProductList('here', localProducts);
				console.log('hereProducts: ', hereProducts);
				window.hereProducts = development ? hereProducts: null;
				self.where = 'here';
				resolve();
			});
		},
		nameTheCity: () => {
			let prodList = `${self.where}Products`;
			let city = window[`${self.where}Products`].city;
			let state = window[`${self.where}Products`].state;
			!!development && console.log('city: ', city);
			!!development && console.log('state: ', state);
			$('.results-city').empty().text(`${city}, ${state}`);
		},
		listTheTypes: () => {
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
		fillTheCards: () => {
			return new Promise(resolve => {
				window.hereProducts = hereProducts;
				var productCards = [],
					$container = $('#cards-container');

				for (var i = 0; i < 3; i++) {
					productCards.push(productCardFactory(hereProducts.products[i]));
				}
				$container.empty().append(productCards.join(''));
				resolve();
			});
		},
		_animateCardDown: ((position, productId) => {
			!!development && console.log('in animateCardDown: ', position);
			return new Promise(resolve => {
				$(`.product-card[position=${position}]`).animate({
					"margin-top": "+=500vh"
				}, 500, function() {
					resolve(productId);
				});
			});
		}),
		animateCardDown: async function(position, productId) {
			try {
				return await self._animateCardDown(position, productId);
			} catch(err) {
				return Promise.reject(err);
			}
		},
		_dismissProduct: productId => {
			!!development && console.log('productId: ', productId);
			return new Promise((resolve, reject) => {
				var pList = window[`${self.where}Products`],
					toDismiss = pList.products.findIndex(function(prod) {
						return prod.uuid === productId;
					}),
					product = pList.products[toDismiss],
					nextProductIndex = 3;

				window.pList = pList;

				pList.products.splice(toDismiss, 1);
				pList.dismissed.push(product);
				var nextProduct = pList.products[nextProductIndex];
				if (nextProduct) {
					resolve(nextProduct);
				} else {
					reject('couldnt find nextProduct');
				}
			});
		},
		dismissProduct: async productId => {
			try {
				const newProduct = await self._dismissProduct(productId);
				!!development && console.log('newProduct: ', newProduct);
				return newProduct;
			} catch(err) {
				return Promise.reject(err);
			}
		},
		getNewProductInfo: newIndex => {
			!!development && console.log('in getNewProductInfo: ', newIndex);
			return new Promise((resolve, reject) => {
				var replacementProduct = window[`${self.where}Products`].products[newIndex];
				if (replacementProduct) {
					resolve(replacementProduct);
				} else {
					reject('replacement product not found!');
				}
			});
		},
		hideAllCards: (productId) => {
			return new Promise(resolve => {
				$('#product-types-container').hide();
				$(`.product-card[position="1"]`).animate({"margin-top": "+=500vh"}, 300);
				$(`.product-card[position="2"]`).animate({"margin-top": "+=500vh"}, 650);
				$(`.product-card[position="3"]`).animate({"margin-top": "+=500vh"}, 1000, resolve(productId));
			});
		},
		showAllCards: () => {
			return new Promise(resolve => {
				$('#product-types-container').fadeIn();
				$(`.product-card[position="1"]`).animate({"margin-top": "-=500vh"}, 300);
				$(`.product-card[position="2"]`).animate({"margin-top": "-=500vh"}, 650);
				$(`.product-card[position="3"]`).animate({"margin-top": "-=500vh"}, 1000, function() {
					resolve();
				});
			});
		},
		handleCardSwap: ((position, productId) => {
			!!development && console.log('in handleCardSwap: ', position);
			self.animateCardDown(position, productId)
				.then(self.dismissProduct)
				.then(newProduct => {
					!!development && console.log('newProduct: ', newProduct);
					var $card = $(`.product-card[position=${position}]`),
						$productTypeName = $card.find('span[slot="product-type-name"]'),
						$productName = $card.find('span[slot="product-name"]'),
						$image = $card.find('img[slot="product-image"]');

					!!development && console.log('$productTypeName: ', $productTypeName);

					$card.attr('productid', newProduct.uuid);
					$productTypeName.empty().text(newProduct.type.name);
					$productName.empty().text(newProduct.details.name);
					$image.attr('src', `${newProduct.images[0].url}`);
					$card.animate({
						"margin-top": "-=500vh"
					}, 500, function() {
						!!development && console.log('ALL DONE');
					});
				})
				.catch(err => {
					!!development && console.error('ERROR! animating card: ', err);
					return;
				});
		}),
		getProductDetails: productId => {
			return new Promise((resolve, reject) => {
				var pList = window[`${self.where}Products`],
					product = pList.products.find(prod => {
						return prod.uuid === productId;
					});
				if (product) {
					resolve(product);
				} else {
					reject('couldnt find the product for the detail view');
				}
			});
		},
		insertTheItemView: product => {
			!!development && console.log('in insertTheItemView: ', product);
			return new Promise((resolve, reject) => {
				var $mainView = $('#main-view');

				if ($('product-detail').length) {
					!!development && console.warn('its already there');
					resolve('already there');
				} else {
					var $productDetail = $(`<product-detail><span slot="product-name">${product.details.name}</span><span slot="product-type">${product.type.name}</span></product-detail-view>`);

					if (product.details && product.details.description && product.details.description.length) {
						$productDetail.append($(`<span slot="product-description">${product.details.description}`));
					}

					$productDetail.insertAfter($mainView);

					$mainView.fadeOut(750, function() {
						$productDetail.attr('visible', '');
						resolve();
					});
				}
			});
		},
		buildDetailView: productId => {
			!!development && console.log('in buildDetailViewwith: ', productId);
			self.hideAllCards(productId)
				.then(self.getProductDetails)
				.then(self.insertTheItemView)
				// .then(self.itemViewPrep)
				.then(self.itemViewBindings())
				.catch(err => {
					!!development && console.error('MASSIVE FAILURE!!!: ', err);
				});
		},
		bindings: () => {
			document.body.addEventListener('openProductDetails', e => {
				!!development && console.log('main side details click');
				!!development && console.log('e.detail.position: ', e.detail.position);
				!!development && console.log('e.detail.productid: ', e.detail.productId);
				self.buildDetailView(e.detail.productId);
			});

			$('.close-icon').off('click').on('click', e => {
				e.preventDefault();
				e.stopPropagation();
				var $me = $(e.target),
					$card = $me.closest('product-card'),
					position = $card.attr('position'),
					productId = $card.attr('productid');

				!!development && console.log('position: ', position);
				!!development && console.log('productId: ', productId);
				self.handleCardSwap(position, productId);
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
		},
		/**
		 * a method called to handle the event bindings during the product detail view
		 * @date   2018-01-05
		 * @author mattbontrager
		 */
		itemViewBindings: () => {
			const invokeTheDl = theList => {
				$('.item-description-view').css('opacity', 0.1);
				$(`#${theList}`).animate({
					'margin-bottom': '+=300',
					'opacity': '1'
				}, 750, () => {
					$(`#${theList}`).addClass('visible');
				});
			};

			const hideTheDl = theList => {
				$('.item-description-view').css('opacity', 1);
				$(`#${theList}`).animate({
					'margin-bottom': '-=300',
					'opacity': '0'
				}, 750, () => {
					$(`#${theList}`).removeClass('visible');
				});
			};

			const makeTheDl = (e, theList, theSelect) => {
				var $me = $(e.target),
					myTop = $me.offset().top,
					myLeft = $me.offset().left,
					myHeight = $me.height(),
					myWidth = $me.width(),
					theBottom = window.innerHeight - myTop + 8,
					theLeft = (theSelect === 'quantity') ? myLeft + 15: myLeft - 15,
					$select = $('.item-availability-' + theSelect + '-input'),
					options = $select.find('option'),
					$dl = $('<dl id="' + theList + '"></dl>'),
					dts = [];

				for (let option of options) {
					let $option = $(option),
						val = $option.val();

					dts.push('<dt>' + val + '</dt>');
				}

				$dl.append(dts.join(''))
					.css({
						'bottom': theBottom + 'px',
						'left': theLeft + 'px',
						'height': 'auto',
						'margin-bottom': '-300px',
						'opacity': '0'
					})
					.appendTo($itemView)
					.stop()
					.animate({
						'margin-bottom': '0',
						'opacity': '1'
					}, 750, () => {
						$dl.addClass('visible');
						self.dlClickHandler(theSelect);
					});
			};

			$checkButton.off('click').on('click', e => {
				e.preventDefault();
				e.stopPropagation();
				$.when(_product.simulateInventoryCheck()).then(function itemAvailable() {
					!!development && console.log('in itemAvailable');
					$.when(self.fadeThisOut($('.item-availability-view'))).done(function() {
						var $toShow = $('.item-checkout-view'),
							$toHide = $('.item-availability-view');

						$.when(self.fadeThisOut($toHide)).done(function() {
							self.fadeThisIn($toShow);
						});
					});
				}, function itemUnavailable() {
					!!development && console.log('in itemUnavailable');
					$.when(self.fadeThisOut($('.item-description-view'))).done(function() {
						$('.item-error-view').empty().html('&#9432; Sold Out');
						$checkButton.addClass('disabled-button');
						self.fadeThisIn($('.item-error-view'));
					});
				});
			});

			$purchaseButton.off('click').on('click', function(e) {
				e.preventDefault();
				e.stopPropagation();
				$.when(self.fadeThisOut($itemView)).done(function() {
					self.fadeThisIn($successView);
					self.successBindings();
				});
			});

			['date', 'time', 'quantity'].forEach(thing => {
				$(`.item-availability-${thing}-input`).off('mousedown').on('mousedown', e => {
					e.preventDefault();
					e.stopPropagation();

					if ($(`#${thing}-option-list`).length) {
						if ($(`#${thing}-option-list`).hasClass('visible')) {
							hideTheDl(`${thing}-option-list`);
						} else {
							invokeTheDl(`${thing}-option-list`);
						}
					} else {
						$('.item-description-view').css('opacity', '0.1');
						makeTheDl(e, `${thing}-option-list`, `${thing}`);
					}
				});
			});
		},
		/**
		 * a method to handle the event bindings of the DL's.
		 * I used Description Lists to simulate the select element
		 * for the purposes of being able to add custom styling.
		 *
		 * In the spirit of DRY, and due to a naming-convention standard, this method handles the
		 * bindings for all of the DL's.
		 * @date   2018-01-05
		 * @author mattbontrager
		 * @param  {String}   whichOne which DL element to assign the handler to
		 */
		dlClickHandler: whichOne => {
			$('dl').off('scroll').on('scroll', e => {
				return false;
			}).off('click').on('click', e => {
				e.preventDefault();
				e.stopPropagation();

				var $me = $(e.target),
					text = $me.text(),
					val = (whichOne === 'quantity') ? text[text.length - 1]: $me.text();

				$(`.item-availability-${whichOne}-input`).val(val);

				$(`#${whichOne}-option-list`).stop().animate({
					'margin-bottom': '-300px',
					'opacity': '0'
				}, 300, () => {
					$('.item-description-view').css('opacity', '1');
					$(`#${whichOne}-option-list`).removeClass('visible');
					$(this).remove();
				});
			})
		},
		/**
		 * prepare the product information for the detailed view
		 * @date   2018-01-05
		 * @author mattbontrager
		 */
		itemViewPrep: () => {
			return new Promise((resolve, reject) => {
				var dts = Times.get(),
					dates = dts.availabilities.dates,
					tempd = [],
					times = dts.availabilities.times,
					tempt = [];

				if ($('.item-description-view').hasClass('hidden')) {
					self.fadeThisOut($('.item-error-view'));
					self.fadeThisIn($('.item-description-view'));
				}

				if ($('.item-availability-view').hasClass('hidden')) {
					self.fadeThisOut($('.item-checkout-view'));
					self.fadeThisIn($('.item-availability-view'));
				}

				if ($checkButton.hasClass('disabled-button')) {
					$checkButton.removeClass('disabled-button');
				}

				$.each(dates, function(i, d) {
					tempd.push('<option class="availability-date-option" data-date-option-number="' + i + '">' + d + '</option>');
				});

				$.each(times, function(j, t) {
					tempt.push('<option class="availability-time-option" data-time-option-number"' + j + '">' + t + '</option>');
				});

				$('.item-availability-date-input').empty().append(tempd.join(''));
				$('.item-availability-time-input').empty().append(tempt.join(''));
				$('.item-availability-date-input').prop('selectedIndex', 0);
				$('.item-availability-time-input').prop('selectedIndex', 0);
				$('.item-availability-quantity-input').prop('selectedIndex', 0);
				resolve();
			});
		},
	};
}());

const loadScript = src => {
	return new Promise((resolve, reject) => {
		const script = document.createElement('script');
		script.async = true;
		script.src = src;
		script.onload = resolve;
		script.onerror = reject;
		document.body.appendChild(script);
	});
};

$(function() {
	App.init();
});
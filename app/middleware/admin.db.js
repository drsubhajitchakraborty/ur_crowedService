const {
	buildSuccObject,
	buildErrObject,
	itemNotFound
} = require('../middleware/utils')
var fs = require('fs');
const uuid = require('uuid')
const moment = require('moment')

var mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const PROFILE_IMAGE_PATH = '/var/www/html/HablaNowApis/views/user-docs/images/'
const MAESTRO_PROFILE_PICTURE = '/var/www/html/HablaNowApis/views/maestro-docs/images/'
const MAESTRO_CV = '/var/www/html/HablaNowApis/views/maestro-docs/cv/'
const MAESTRO_VIDEO = '/var/www/html/HablaNowApis/views/maestro-docs/videos/'
const MAESTRO_BANK_DOCS = '/var/www/html/HablaNowApis/views/maestro-docs/bank_docs/'
const MAESTRO_SIGNATURE_FILE = '/var/www/html/HablaNowApis/views/maestro-docs/signature_files/'


const ORG__IMAGE_PATH = '/var/www/html/HablaNowApis/views/org-docs/profile_image/'
/**
 * Builds sorting
 * @param {string} sort - field to sort from
 * @param {number} order - order for query (1,-1)
 */
const buildSort = (sort, order) => {
	const sortBy = {}
	sortBy[sort] = order
	return sortBy
}

/**
 * Hack for mongoose-paginate, removes 'id' from results
 * @param {Object} result - result object
 */
const cleanPaginationID = result => {
	result.docs.map(element => delete element.id)
	return result
}

/**
 * Builds initial options for query
 * @param {Object} query - query object
 */

const fileUnlinkFormServer1 = async filePath => {
	fs.unlink(filePath, (err) => {
		if (err) {
			console.log("Error deleting file from server")
		} else {
			console.log("File deleted from server successfully")
		}
	});
}
const listInitOptions = async req => {
	return new Promise(resolve => {
		const order = req.query.order || -1
		const sort = req.query.sort || 'createdAt'
		const sortBy = buildSort(sort, order)
		const page = parseInt(req.query.page, 10) || 1
		const limit = parseInt(req.query.limit, 10) || 5
		const options = {
			sort: sortBy,
			lean: true,
			page,
			limit
		}
		resolve(options)
	})
}



module.exports = {

  async base64ImageUpload(object) {


    return new Promise((resolve, reject) => {
      try{
        var image;
        var image_name = new Date().valueOf().toString() + Math.random().toString(36).slice(-8);
        image = object.image_data.toString().split(";base64,");
        var bitmap =Buffer.from(image[1], 'base64');
        var imageType = image[0].split('/')[1];
        var randomImageName = image_name + "." + imageType
        var imagePath =  object.path + "/"
        fs.writeFileSync(imagePath + randomImageName, bitmap);
        // fs2.writeFileSync(imagePath + randomImageName, bitmap);
        resolve (randomImageName)
    } catch (err) {
      console.log(err.message)
      reject(buildErrObject(422, 'ERROR_FILE_UPLOAD'))
    }
  });

  },
  async uploadImage(object) {
    // console.log('object========',object)
    return new Promise((resolve, reject) => {
        var obj = object.image_data
        var imageName = obj.name
        var string = Date.now()+imageName.replace(/[&\/\\#,+()$~%'":*?<>{}\s]/g, '_')
        obj.mv(object.path + '/' + string, function (err) {
          if (err) {
              //console.log(err);
              reject(buildErrObject(422, err.message))
          }
          resolve(string)
        })
    })
  },

  async uploadMediaArray(object) {
    return new Promise((resolve, reject) => {
        var medias = [];
        object.files.forEach(function(val, ind) {
      var obj = val
            var imageName = obj.name
            var string = Date.now()+imageName.replace(/[&\/\\#,+()$~%'":*?<>{}\s]/g, '_')
            obj.mv(object.path + '/' + string, function (err) {
                if (err) {
                  reject(buildErrObject(422, err.message))
                }
                medias.push(string);
                if (object.files.length - 1 == ind) {
                    resolve(medias);
                }
            });
          });
    });
},

async fileUnlinkFormServer(object) {
  return new Promise((resolve, reject) => {
      try{
         fs.unlink(object, (err) => {
          if (err) {
              resolve(false)
          } else {
              console.log("File deleted from server successfully")
              resolve(true)
          }
      });
    } catch (err) {
      console.log(err.message)
      reject(buildErrObject(422, 'ERROR_WITH_FILTER'))
    }
  });
},

	/**
	 * Checks the query string for filtering records
	 * query.filter should be the text to search (string)
	 * query.fields should be the fields to search into (array)
	 * @param {Object} query - query object
	 */
	async checkQueryString(query) {
		return new Promise((resolve, reject) => {
			try {
				if (
					typeof query.filter !== 'undefined' &&
					typeof query.fields !== 'undefined'
				) {
					const data = {
						$or: []
					}
					const array = []
					// Takes fields param and builds an array by splitting with ','
					const arrayFields = query.fields.split(',')
					// Adds SQL Like %word% with regex
					arrayFields.map(item => {
						array.push({
							[item]: {
								$regex: new RegExp(query.filter, 'i')
							}
						})
					})
					// Puts array result in data
					data.$or = array
					resolve(data)
				} else {
					resolve({})
				}
			} catch (err) {
				console.log(err.message)
				reject(buildErrObject(422, 'ERROR_WITH_FILTER'))
			}
		})
	},

	/**
	 * Gets items from database
	 * @param {Object} req - request object
	 * @param {Object} query - query object
	 */
	async getItems(req, model, query) {
		const options = await listInitOptions(req)
		return new Promise((resolve, reject) => {
			model.paginate(query, options, (err, items) => {
				if (err) {
					reject(buildErrObject(422, err.message))
				}
				resolve(cleanPaginationID(items))
			})
		})
	},




	/**
	 * Gets item from database by id
	 * @param {string} id - item id
	 */
	async getItem(id, model) {
		return new Promise((resolve, reject) => {
			model.findById(id, (err, item) => {
				itemNotFound(err, item, reject, 'NOT_FOUND')
				resolve(item)
			})
		})
	},

	/**
	 * Gets item from database by id
	 * @param {string} id - item id
	 */
	async getItemByEmail(email, model) {
		return new Promise((resolve, reject) => {
			model.findOne({email:email},'+password loginAttempts',(err, item) =>{
        itemNotFound(err, item, reject, 'USER_NOT_FOUND')
        console.log(item);
				resolve(item)
			})
		})
	},

	/**
	 * Gets item from database by id
	 * @param {string} id - item id
	 */
	async findOneData(id, model) {
		return new Promise((resolve, reject) => {
			model.findById(id, (err, item) => {
				itemNotFound(err, item, reject, 'NOT_FOUND')
				resolve(item)
			})
		})
	},

	/**
	 * Creates a new item in database
	 * @param {Object} req - request object
	 */
	async createItem(req, model) {
		return new Promise((resolve, reject) => {
			model.create(req, (err, item) => {
				if (err) {
					reject(buildErrObject(422, err.message))
				}
				resolve(item)
			})
		})
	},
	async checkItem(req, model) {
		return new Promise((resolve, reject) => {
			model.findOne(req, (err, item) => {
				if (err) {
					reject(buildErrObject(422, err.message))
				}
    // console.log('daat item=======', item);

        if(item){
				resolve(true)
      }else{
        resolve(false)
      }
			})
		})
	},

	/**
	 * Updates an item in database by id
	 * @param {string} id - item id
	 * @param {Object} req - request object
	 */
	async updateItem(id, model, req) {
		// console.log('model==>', req);
		return new Promise((resolve, reject) => {
			model.findByIdAndUpdate(
				id,
				req,
				{
					new: true,
					runValidators: true
				},
				(err, item) => {
					itemNotFound(err, item, reject, 'NOT_FOUND')
					if (item) {
						var resp = { response: true, status: 200, data: item };
						resolve(resp)
					}
				}
			)
		})
	},


	async filesImage(object) {
		// console.log("=-======", object)
		return new Promise((resolve, reject) => {
			var obj = object.image_data;
			// console.log("OBJ", obj)
			var nameFile = Date.now() + obj.name;
			var imageRemoteName = object.path + '/' + nameFile;
			obj.mv(object.path + nameFile, function (err) {
				if (err) {
					console.log(err, "+==")
				}
				// resolve(nameFile.toString())
				console.log("================")
				resolve(nameFile.toString())
			});

		}).catch(err => {
			console.log('failed:', err)
		})
	},






	/**
	 * Deletes an item from database by id
	 * @param {string} id - id of item
	 */
	async deleteItem(id, model) {
		return new Promise((resolve, reject) => {
			model.findByIdAndRemove(id, (err, item) => {
				itemNotFound(err, item, reject, 'NOT_FOUND')
				resolve(buildSuccObject('DELETED'))
			})
		})
	},

	/**
	 * Deletes an item from database by id
	 * @param {string} id - id of item
	 */
	async deleteItems(id, model) {
		return new Promise((resolve, reject) => {
			model.deleteMany( {
        _id: {
          $in: id
        }
      }, (err, item) => {
				itemNotFound(err, item, reject, 'NOT_FOUND')
				resolve(buildSuccObject('DELETED'))
			})
		})
  },

  async saveContent(model, body) {
		return new Promise((resolve, reject) => {
			model.ContentManagement.updateOne({
				content_type: body.content_type
			}, {
				$set: {
					content: body.content
				}
			}).then(rt => {
				resolve({
					code: 200,
				})
			}).catch(err => {
				reject(buildErrObject(422, err.message))
			})

		})
  },



	async getMestroEarnedCredit(model, body) {
		return new Promise((resolve, reject) => {
			model.CreditTransaction.aggregate(
				[
					{
						$match: {
							maestro_id: ObjectId(body.maestro_id)
						},
					},

					{
						$group:
						{
							_id: "$maestro_id",
							totalCredit: { $sum: "$credit_transaction" },
							count: { $sum: 1 }
						}
					}
				]
			).then(rr => {
				console.log(rr);
				resolve(rr)
			}).catch(err => {
				console.log(err)
				reject(buildErrObject(422, err.message))
			})
		})
	},

	async checkEmailExist(model, body) {
		return new Promise((resolve, reject) => {
			model.User.findOne({
				email: body.email
			}).then(flag => {
				if (flag) {
					resolve(true)
				} else {
					resolve(false)
				}
			}).catch(err => {
				reject(buildErrObject(422, err.message))
			})

		})
	},



	async getSubAdminList(model, body) {
		return new Promise(async (resolve, reject) => {
			const options = await listInitOptions(body.req)

			model.Admin.find({
				role: "subadmin"
			}).limit(options.limit).skip(options.offset).sort({
				createdAt: -1
			}).then(rr => {
				model.Admin.countDocuments({
					role: "subadmin"
				}).then(count => {
					resolve({
						code: 200,
						list: rr,
						count: count,
					})
				}).catch(err => {
					reject(buildErrObject(422, err.message))
				})

			}).catch(err => {
				reject(buildErrObject(422, err.message))
			})

		})
	},


	async checkAdminEmail(model, body) {
		return new Promise((resolve, reject) => {
			var query = {
				email: body.email
			}
			if (body.user_id) {
				query = {
					email: body.email,
					_id: {
						$ne: body.user_id
					}
				}
			}
			console.log('final query ============================', query)
			model.Admin.findOne(query).then(flag => {
				if (flag) {
					resolve({
						isExist: true,
						code: 200,
					})
				} else {
					resolve({
						isExist: false,
						code: 200,
					})
				}
			}).catch(err => {
				reject(buildErrObject(422, err.message))
			})

		})
	},



	/**
	 * Deletes an item from database by id
	 * @param {string} id - id of item
	 */
	async deleteUser(id, model, image) {
		return new Promise(async (resolve, reject) => {
			await fileUnlinkFormServer1(PROFILE_IMAGE_PATH + image)
			model.findByIdAndRemove(id, (err, item) => {
				itemNotFound(err, item, reject, 'NOT_FOUND')
				resolve(buildSuccObject('DELETED'))
			})
		})
	},
	/**
	 * Deletes an item from database by id
	 * @param {string} id - id of item
	 */
	async getDashboardSiteStatistics(model) {
		return new Promise(async (resolve, reject) => {
			var start = moment().startOf('day'); // set to 12:00 am today
			var end = moment().endOf('day'); // set to 23:59 pm today
			var yesterday = moment().subtract(7, 'days')
			console.log('var yesterday = moment().subtract(=================', yesterday)
			console.log('var yesterday = moment().subtract(=================', end)
			model.Maestro.countDocuments().then(maestroCount => {
				model.Organization.countDocuments().then(organizationCount => {
					model.User.countDocuments().then(userCount => {
						model.Maestro.countDocuments({
							"createdAt": {
								"$gte": new Date(start),
								"$lte": new Date(end)
							}
						}).then(maestroCountToDay => {
							model.Organization.countDocuments({
								"createdAt": {
									"$gte": new Date(start),
									"$lte": new Date(end)
								}
							}).then(organizationCountToDay => {
								model.User.countDocuments({
									"createdAt": {
										"$gte": new Date(start),
										"$lte": new Date(end)
									}
								}).then(userCountToDay => {
									var data = {
										maestroCount: maestroCount,
										organizationCount: organizationCount,
										userCount: userCount,
										maestroCountToDay: maestroCountToDay,
										organizationCountToDay: organizationCountToDay,
										userCountToDay: userCountToDay

									}
									resolve(data)
								}).catch(err => { console.log(err) })
							}).catch(err => { console.log(err) })
						}).catch(err => { console.log(err) })
					}).catch(err => { console.log(err) })
				}).catch(err => { console.log(err) })
			}).catch(err => { console.log(err) })


		})
	},
	/**
	 * Deletes an item from database by id
	 * @param {string} id - id of item
	 */

	async GetPieChartData(model, body) {
		return new Promise((resolve, reject) => {
			var start = moment().startOf('day'); // set to 12:00 am today
			var end = moment().endOf('day'); // set to 23:59 pm today
			// var sevenday = moment().subtract(30, 'days').format('YYYY-mm-dd')
			// var yesterday = moment().subtract(1, 'days')
			var yesterday = moment().subtract(24, 'hours')
			moment().subtract(24, 'hours').format()
			console.log('=================================', new Date(yesterday))
			console.log('=======start==========================', new Date(start))
			model.aggregate(
				[
					{
						$group:
						{
							_id: "$topic_type",
							count: { $sum: 1 }
						}
					}
				]
			).then(topicData => {
				model.aggregate(
					[
						{
							$group: {
								_id: "$call_duration",
								count: { $sum: 1 },
							}
						}
					]
				).then(callData => {
					model.countDocuments({
						"extend_more.0": { "$exists": true },
						call_status: { $in: ['Accepted', 'Completed'] }
					}).then(extendedData => {
						model.countDocuments({
							"extend_more.0": { "$exists": false },
							call_status: { $in: ['Accepted', 'Completed'] }
						}).then(normalCallData => {

							model.find({
								"createdAt": { "$gte": start, "$lt": end },
								call_status: { $in: ['Accepted', 'Completed'] }
							})
								.then(callduration => {
									model.countDocuments({
										"createdAt": { "$gte": yesterday },
										call_status: 'Rejected'
									})
										.then(rejectedCallDuration => {
											console.log('rejectedCallDuration=========================', rejectedCallDuration)

											resolve({ topicData, callData, extendedData, normalCallData, callduration: callduration, rejectedCallDuration })

										}).catch(err => {
											console.log(err)
											reject(buildErrObject(422, err.message))
										})
								}).catch(err => {
									console.log(err)
									reject(buildErrObject(422, err.message))
								})

						}).catch(err => {
							console.log(err)
							reject(buildErrObject(422, err.message))
						})

					}).catch(err => {
						console.log(err)
						reject(buildErrObject(422, err.message))
					})

				}).catch(err => {
					console.log(err)
					reject(buildErrObject(422, err.message))
				})
			}).catch(err => {
				console.log(err)
				reject(buildErrObject(422, err.message))
			})
		})
	},

	async GetSubscriptionPieData(model, body) {
		return new Promise((resolve, reject) => {
			model.find().populate([
				{
					path: "subs_plans_data",
					match: {
						status: "active",
					},
					populate: {
						path: "plans_calls",
						match: {
							call_status: {
								$in: ["Accepted", 'Completed']
							}
						}
					}
				}

			])
				.then(data => {
					resolve(data)
				}).catch(err => {
					console.log(err)
					reject(buildErrObject(422, err.message))
				})
		})
	},
	async GetSubscriptionEarinig(model) {
		return new Promise((resolve, reject) => {
			model.aggregate(
				[
					{
						$group:
						{
							_id: null,
							totalAmount: { $sum: "$amount" },
							count: { $sum: 1 }
						}
					}
				]
			)
				.then(data => {
					resolve(data)
				}).catch(err => {
					console.log(err)
					reject(buildErrObject(422, err.message))
				})
		})
	},
	async GetPieChartUserVsMaestros(model, model1) {
		return new Promise((resolve, reject) => {
			model.countDocuments({
				verified:true
			}).then(userData => {
				model1.countDocuments({
					'settings.availability':true
				}).then(maestorData => {
					resolve({maestorData:maestorData,userData:userData})
				}).catch(err => {
					console.log(err)
					reject(buildErrObject(422, err.message))
				})
			}).catch(err => {
				console.log(err)
				reject(buildErrObject(422, err.message))
			})
		})
	},

  //////////////////////////
  async getCategoryItemPagination(req, model) {

		// console.log('model==>', model);
		return new Promise((resolve, reject) => {
			if(req.direction=='asc'){
				var dir_='ascending';
			}else{
				var dir_='descending';
			}
      var whereArr = {}
			if(req.search!=null && req.search!=''){
				var whereArr={

             $or:[
              {
                categoryName: {
                  $regex: '.*' + req.search + '.*',
                       $options: 'i'
                   },
              },
              {
                name: {
                  $regex: '.*' + req.search + '.*',
                       $options: 'i'
                   },
              },
              {
                email: {
                  $regex: '.*' + req.search + '.*',
                       $options: 'i'
                   },
              },
              {
                city: {
                  $regex: '.*' + req.search + '.*',
                       $options: 'i'
                   },

              },
              {
                webUrl: {
                  $regex: '.*' + req.search + '.*',
                       $options: 'i'
                   },
              },
              {
                question: {
                  $regex: '.*' + req.search + '.*',
                       $options: 'i'
                   },
              },
              {
                promoCode: {
                  $regex: '.*' + req.search + '.*',
                       $options: 'i'
                   },
              },
              {
                page_heading: {
                  $regex: '.*' + req.search + '.*',
                       $options: 'i'
                   },
              },
              {
                page_name: {
                  $regex: '.*' + req.search + '.*',
                       $options: 'i'
                   },
              },
            ]

				};
			}
			var sort=req.sortby;
			model.find(
				whereArr
			)
			.skip(parseInt(req.offset)).limit(parseInt(req.limit))
			.sort([[sort, dir_]])
			// .sort({ sort: dir_ })
			.then(success=>{
				if (success.length>0) {
					model.countDocuments(whereArr).then(count =>{
						resolve({data:success,count:count})
					})
				}else{
					reject(buildErrObject(404,'Data not found'))
				}
			}).catch(err =>{
				console.log('err=========',err)
			})
    })

	},
  async getMenusItemPagination(req, model) {

		// console.log('model==>', model);
		return new Promise((resolve, reject) => {
			if(req.direction=='asc'){
				var dir_='ascending';
			}else{
				var dir_='descending';
			}
      var whereArr = {}
			if(req.search!=null && req.search!=''){
				var whereArr={
          $or:[
						{
							menuName: {
								$regex: '.*' + req.search + '.*',
         						$options: 'i'
   							},
						},
						{
							description: {
								$regex: '.*' + req.search + '.*',
         						$options: 'i'
   							},
						}
					]

				};
			}
			var sort=req.sortby;
			model.find(
				whereArr
			).populate('categoryId').populate('restaurantId','name')
			.skip(parseInt(req.offset)).limit(parseInt(req.limit))
			.sort([[sort, dir_]])
			// .sort({ sort: dir_ })
			.then(success=>{
				if (success.length>0) {
					model.countDocuments(whereArr).then(count =>{
						resolve({data:success,count:count})
					})
				}else{
					reject(buildErrObject(404,'Data not found'))
				}
			}).catch(err =>{
				console.log('err=========',err)
			})
    })

	},
  async getPromoCodeItemPagination(req, model) {

		// console.log('model==>', model);
		return new Promise((resolve, reject) => {
			if(req.direction=='asc'){
				var dir_='ascending';
			}else{
				var dir_='descending';
			}
      var whereArr = {}
			if(req.search!=null && req.search!=''){
				var whereArr={
          $or:[
						{
							promoCode: {
								$regex: '.*' + req.search + '.*',
         						$options: 'i'
   							},
						},
						{
							promoCodeDesciption: {
								$regex: '.*' + req.search + '.*',
         						$options: 'i'
   							},
						}
					]

				};
			}
			var sort=req.sortby;
			model.find(
				whereArr
			).populate('restaurantId','name')
			.skip(parseInt(req.offset)).limit(parseInt(req.limit))
			.sort([[sort, dir_]])
			// .sort({ sort: dir_ })
			.then(success=>{
				if (success.length>0) {
					model.countDocuments(whereArr).then(count =>{
						resolve({data:success,count:count})
					})
				}else{
					reject(buildErrObject(404,'Data not found'))
				}
			}).catch(err =>{
				console.log('err=========',err)
			})
    })

	},
  async getItemPagination(req, model) {

		// console.log('model==>', model);
		return new Promise((resolve, reject) => {
			if(req.direction=='asc'){
				var dir_='ascending';
			}else{
				var dir_='descending';
			}
      	var whereArr = {}
			if(req.search!=null && req.search!=''){
				var whereArr={
          			$or:[
						{
							name: {
								$regex: '.*' + req.search + '.*',
         						$options: 'i'
   							},
						},
					]

				};
			}
			var sort=req.sortby;
			model.find(
				whereArr
			)
			.skip(parseInt(req.offset)).limit(parseInt(req.limit))
			.sort([[sort, dir_]])
			// .sort({ sort: dir_ })
			.then(success=>{
				if (success.length>0) {
					model.countDocuments(whereArr).then(count =>{
						resolve({data:success,count:count})
					})
				}else{
					reject(buildErrObject(404,'Data not found'))
				}
			}).catch(err =>{
				console.log('err=========',err)
			})
    	})

	},

  async getAllUserItemPagination(req, model) {

		// console.log('model==>', model);
		return new Promise((resolve, reject) => {
			if(req.direction=='asc'){
				var dir_='ascending';
			}else{
				var dir_='descending';
			}
      	var whereArr = {}
			if(req.search!=null && req.search!=''){
				var whereArr={
      				$or:[
						{
							name: {
								$regex: '.*' + req.search + '.*',
         						$options: 'i'
   							},
						},
						{
							email: {
								$regex: '.*' + req.search + '.*',
         						$options: 'i'
   							},
						},
						{
							phone: {
								$regex: '.*' + req.search + '.*',
         						$options: 'i'
   							},
						},
						{
							zipCode: {
								$regex: '.*' + req.search + '.*',
         						$options: 'i'
   							},
						},
					]

				};
			}
			var sort=req.sortby;
			model.find(
				whereArr
			)
			.skip(parseInt(req.offset)).limit(parseInt(req.limit))
			.sort([[sort, dir_]])
			// .sort({ sort: dir_ })
			.then(success=>{
				if (success.length>0) {
					model.countDocuments(whereArr).then(count =>{
						resolve({data:success,count:count})
					})
				}else{
					reject(buildErrObject(404,'Data not found'))
				}
			}).catch(err =>{
				console.log('err=========',err)
			})
    })

	},


}

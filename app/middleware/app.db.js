const {
    buildSuccObject,
    buildErrObject,
    itemNotFound
} = require('../middleware/utils')

const __dir = "/var/www/html/goGroceryApis/public/"
var fs = require("fs");

var mongoose = require('mongoose');
// const ObjectId = mongoose.Types.ObjectId;

//Model


const GeoFencing = require('../models/user')

const request = require('request');

var cron = require('node-cron');
const Geo = require('geo-nearby');


function inside(point, vs) {
    // ray-casting algorithm based on
    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

    var x = point[0], y = point[1];

    var inside = false;
    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        var xi = vs[i][0], yi = vs[i][1];
        var xj = vs[j][0], yj = vs[j][1];

        var intersect = ((yi >= y) != (yj >= y))
            && (x <= (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }

    return inside;
};

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
const cleanPaginationID = (result) => {
    result.docs.map((element) => delete element.id)
    return result
}

/**
 * Builds initial options for query
 * @param {Object} query - query object
 */
const listInitOptions = async (req) => {
    return new Promise((resolve) => {
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

const fileUnlinkFormServers = async (filePath) => {
    await fs.unlink(filePath, (err) => {
        if (err) {
            console.log("Error deleting file from server")
        } else {
            console.log("File deleted from server successfully")
        }
    });
}
module.exports = {
    async uploadImage(object) {
        console.log('object========', object)
        return new Promise((resolve, reject) => {
            var obj = object.image_data
            var imageName = obj.name
            var string = imageName.replace(/[&\/\\#,+()$~%'":*?<>{}\s]/g, '_')
            obj.mv(object.path + '/' + string, function(err) {
                if (err) {
                    //console.log(err);
                    reject(utils.buildErrObject(422, err.message))
                }
                resolve(string)
            })
        })
    },

    async uploadGalleryMediaArray(object) {
        return new Promise((resolve, reject) => {
            var medias = [];
            object.files.forEach(function(val, ind) {

                console.log('uploadMediaArray===================',val);
                var obj = val
                var imageName = obj.name
                var imageSize = (parseInt(obj.size)/1024)
                var string = imageName.replace(/[&\/\\#,+()$~%'":*?<>{}\s]/g, '_')
                obj.mv(object.path + '/' + string, function(err) {
                    if (err) {
                        reject(utils.buildErrObject(422, err.message))
                    }
                    medias.push({name:string, size:imageSize});
                    if (object.files.length - 1 == ind) {
                        resolve(medias);
                    }
                });
            });
        });
    },

    async uploadMediaArray(object) {
        return new Promise((resolve, reject) => {
            var medias = [];
            object.files.forEach(function(val, ind) {

                console.log('uploadMediaArray===================');
                var obj = val
                var imageName = obj.name
                var string = imageName.replace(/[&\/\\#,+()$~%'":*?<>{}\s]/g, '_')
                obj.mv(object.path + '/' + string, function(err) {
                    if (err) {
                        reject(utils.buildErrObject(422, err.message))
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
            try {
                console.log('file link===================', object);
                fs.unlink(object, (err) => {
                    if (err) {
                console.log('err==========---------',err)
                        reject(buildErrObject(422, 'FILE NOT DELETED FROM SERVER'))
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
                    arrayFields.map((item) => {
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

    /**
     * Updates an item in database by id
     * @param {string} id - item id
     * @param {Object} req - request object
     */
    async updateItem(id, model, req) {
        return new Promise((resolve, reject) => {
            model.findByIdAndUpdate(
                id,
                req, {
                    new: true,
                    runValidators: true
                },
                (err, item) => {
                    itemNotFound(err, item, reject, 'NOT_FOUND')
                    resolve(item)
                }
            )
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
    async deleteAllItemCart(id, model) {
        return new Promise((resolve, reject) => {
            model.deleteMany({
                user_id: id
            }, (err, item) => {
                itemNotFound(err, item, reject, 'NOT_FOUND')
                resolve(buildSuccObject('DELETED'))
            })
        })
    },

    async getItemPagination(req, model) {
        // console.log('model==>', req);
        return new Promise((resolve, reject) => {
            model.find({
                deleted_at: 'false',
                status: 'active'
            }).skip(parseInt(req.offset_val)).limit(parseInt(req.limit_val)).then(success => {
                if (success.length > 0) {
                    model.countDocuments({
                        deleted_at: 'false',
                        status: 'active'
                    }).then(count => {
                        resolve({
                            data: success,
                            count: count
                        })
                    })
                } else {
                    reject(buildErrObject(404, 'Data not found'))
                }
            })
        })
    },

    async getBannerAccToStore(req, model) {
        // console.log('model==>', req);
        return new Promise((resolve, reject) => {
            model.find({
                    store_id: req,
                    deleted_at: 'false',
                    status: 'active'
                })
                .then(success => {
                    resolve(success)
                })
        })
    },

    async getCategoryIdFromProduct(req, model) {
        // console.log('model==>', req);
        return new Promise((resolve, reject) => {
            model.find({
                    store_id: req,
                    deleted_at: 'false',
                    status: 'active'
                })

                .populate([{
                    path: "category_id",
                    match: {
                        status: "active",
                        deleted_at: "false"
                    },
                }, ])
                .then(success => {
                    var cat_id = [];
                    if (success.length > 0) {
                        // console.log('success==============',success)
                        success.forEach(async (val, arr, ind) => {
                            cat_id.push(val.category_id._id);
                        })
                        resolve(cat_id)
                    } else {
                        resolve(cat_id)
                    }
                })
        })
    },

    async getCategoryProduct(req, model) {
        // console.log('model==>', req);
        return new Promise((resolve, reject) => {
            model.find({
                    _id: {
                        $in: req.cat_id
                    },
                    status: "active",
                    deleted_at: "false"
                })
                .populate({
                    path: 'CategoryProductLimit',
                    match: {
                        store_id: req.store_id
                    },
                    // populate :{
                    //   path: 'store_id',
                    //   // select: '_id name'
                    // }
                })

                // .populate("CategoryProductLimit")
                .then(category => {
                    if (category.length > 0) {
                        resolve(category)
                    } else {
                        resolve(false)
                    }
                })
        })
    },



    async getBannerStoreList(req, model) {
        // console.log('model==>', req);
        return new Promise((resolve, reject) => {
            model.find({
                    store_id: req,
                })
                .then(success => {
                    resolve(success)
                })
        })
    },

    async getProductDetails(req, model) {
        // console.log('model==>', req);
        return new Promise((resolve, reject) => {
            model.findOne({
                    _id: req,
                }).populate('category_id').populate('brand_id')
                .then(success => {

                    resolve(success)
                })
        })
    },

    async getUserItemPagination(id, model, req) {
        // console.log('model==>', req);
        return new Promise((resolve, reject) => {
            model.find({
                    user_id: id
                })

                // .populate('category_id')
                .skip(parseInt(req.offset_val)).limit(parseInt(req.limit_val)).then(success => {
                    if (success.length > 0) {
                        model.countDocuments({
                                // deleted_at:'false'
                            })

                            .then(count => {
                                resolve({
                                    data: success,
                                    // count: count
                                })
                            })
                    } else {
                        reject(buildErrObject(404, 'Data not found'))
                    }
                })
        })
    },
    // async getDriverItemPagination(model, req) {
    //   console.log('model==>', req.body);
    //   return new Promise((resolve, reject) => {
    //     model.find({
    //       user_id:id
    //     })

    //     // .populate('category_id')
    //     .skip(parseInt(req.offset_val)).limit(parseInt(req.limit_val)).then(success=>{
    //       if (success.length>0) {
    //         model.countDocuments({
    //           // deleted_at:'false'
    //         })

    //         .then(count =>{
    //           resolve({data:success,count:count})
    //         })
    //       }else{
    //         reject(buildErrObject(404,'Data not found'))
    //       }
    //     })
    //   })
    // },

    async getCountcartProduct(req, model) {
        // console.log('model==>', req);
        return new Promise((resolve, reject) => {
            model.countDocuments({
                    user_id: req,
                })
                .then(success => {
                    resolve(success)
                })
        })
    },
    // async GetStoreListWithZipcode(req, model) {
    //       console.log('model==>', req);
    //       console.log('+++++++++++++',req.pincode);
    //       // console.log('model==model====================>', model);
    //       var pincodes = req.pincode.toString();
    //       return new Promise((resolve, reject) => {
    //         model.find({
    //           pincode: pincodes,
    //           deleted_at:'false',
    //           status:'active'
    //         }).skip(parseInt(req.offset_val)).limit(parseInt(req.limit_val)).then(success=>{
    //           console.log('!!!!!!!!!!!!!!!!',success);
    //           if (success.length>0) {
    //             model.countDocuments({
    //               pincode: req.pincode,
    //               deleted_at:'false',
    //               status:'active'
    //             }).then(count =>{
    //               console.log('*********',count);
    //               resolve({data:success,count:count})
    //             })
    //           }else{
    //             reject(buildErrObject(404,'Data not found'))
    //           }
    //         }).catch(err => {
    //           console.log('err===========', err)
    //         })
    //       })
    //     },

    async GetStoreListWithZipcode14Oct(req, model) {
        console.log('model==>', req);
        console.log('+++++++++++++', req.pincode);
        // console.log('model==model====================>', model);
        return new Promise((resolve, reject) => {
            request({
                url: 'https://maps.googleapis.com/maps/api/geocode/json?address=' + req.pincode + '&key=AIzaSyAmGR3wSSU5xkT2B5UWN4SKBQKDKn5OBVY',
                // url: 'https://maps.googleapis.com/maps/api/geocode/json?address%20=%201301%20lombard%20street%20philadelphia',
                //json = true
            }, (error, response, body) => {
                console.log(body);
                var body = JSON.parse(body)
                var lat_ = body.results[0].geometry.location.lat
                var lng_ = body.results[0].geometry.location.lng
                model.find({
                    deleted_at: 'false',
                    status: 'active'
                }).then(success => {
                    console.log('!!!!!!!!!!!!!!!!', success);
                    if (success.length > 0) {
                        var store_ids = [];
                        var restur = [];
                        var range = parseFloat(15000);
                        success.forEach(async function(val, ind, arr) {

                            restur.push({
                                'lat': val.latitude,
                                'lon': val.longitude,
                                'id': val._id
                            });
                            const geo = new Geo(restur, {
                                setOptions: {
                                    id: 'id',
                                    lat: 'lat',
                                    lon: 'lon'
                                }
                            });

                            // var okay = geo.nearBy(req.body.lat, req.body.lng, range);
                            var okay = geo.nearBy(lat_, lng_, range);
                            store_ids = okay.map(function(v) {
                                return v.i
                            });

                        })
                        console.log('--------store_ids', store_ids)
                        model.find({
                            _id: {
                                $in: store_ids
                            },
                            deleted_at: 'false',
                            status: 'active'
                        }).skip(parseInt(req.offset_val)).limit(parseInt(req.limit_val)).then(succ_ed => {
                            console.log('!!!!!!!!!!!!!!!!', succ_ed);
                            if (succ_ed.length > 0) {
                                model.countDocuments({
                                    _id: {
                                        $in: store_ids
                                    },
                                    deleted_at: 'false',
                                    status: 'active'
                                }).then(count => {
                                    console.log('*********', count);
                                    resolve({
                                        data: succ_ed,
                                        count: count
                                    })
                                })
                            } else {
                                reject(buildErrObject(404, 'Data not found'))
                            }
                        }).catch(err => {
                            console.log('err===========', err)
                        })
                    } else {
                        reject(buildErrObject(404, 'Data not found'))
                    }
                }).catch(err => {
                    console.log('err===========', err)
                })
            });
            // var pincodes = req.pincode.toString();
            //   model.find({
            //     pincode: pincodes,
            //     deleted_at:'false',
            //     status:'active'
            //   }).skip(parseInt(req.offset_val)).limit(parseInt(req.limit_val)).then(success=>{
            //     console.log('!!!!!!!!!!!!!!!!',success);
            //     if (success.length>0) {
            //       model.countDocuments({
            //         pincode: req.pincode,
            //         deleted_at:'false',
            //         status:'active'
            //       }).then(count =>{
            //         console.log('*********',count);
            //         resolve({data:success,count:count})
            //       })
            //     }else{
            //       reject(buildErrObject(404,'Data not found'))
            //     }
            //   }).catch(err => {
            //     console.log('err===========', err)
            //   })
        })
    },

    async GetStoreListWithZipcode(req, model) {
       console.log('model==>', req);
       console.log('+++++++++++++', req.pincode);
        // console.log('model==model====================>', model);
        return new Promise((resolve, reject) => {
            request({
                url: 'https://maps.googleapis.com/maps/api/geocode/json?address=' + req.pincode + '&key=AIzaSyAmGR3wSSU5xkT2B5UWN4SKBQKDKn5OBVY',
                // url: 'https://maps.googleapis.com/maps/api/geocode/json?address%20=%201301%20lombard%20street%20philadelphia',
                //json = true
            }, async (error, response, body) => {
                console.log(body);
                var body = JSON.parse(body)
                if(error){
                    reject(buildErrObject(404,'Service not provided'))
                }else{
                    if(body.results.length>0){

                        GeoFencing.find().then(await function (zoneData){
                            if(zoneData.length>0){
                                var pointInside = 'false'
                                for (var i = 0; i < zoneData.length; i++) {
                                    var latArray = JSON.parse(zoneData[i].polygon_coordinates)
                                    var result = Object.keys(latArray).map(function(key) {
                                        return ReqPolygon= [latArray[key].lat,latArray[key].lng];
                                    });
                                    console.log(i)
                                    if((inside([parseFloat(body.results[0].geometry.location.lat),parseFloat(body.results[0].geometry.location.lng)],result))==true){
                                        // res.send({
                                        //  response:true,
                                        //  message:'Pont Lies inside Zone'
                                        // })
                                        pointInside = 'true'

                                    }

                                }
                                console.log('after for loop')
                                console.log(pointInside)
                                if(pointInside=='true'){
                                    model.find({
                                         // pincode: req.zip_code,
                                        deleted_at:'false',
                                        status:'active'
                                    }).skip(parseInt(req.offset_val)).limit(parseInt(req.limit_val)).then(success=>{
                                        if (success.length>0) {
                                            model.countDocuments({
                                                // pincode: req.zip_code,
                                                deleted_at:'false',
                                                status:'active'
                                            }).then(count =>{
                                                resolve({data:success,count:count})
                                            })
                                        }else{
                                            reject(buildErrObject(404,'Data not found'))
                                        }
                                    }).catch(err => {
                                        console.log('err===========', err)
                                    })
                                    // res.send({
                                    //     response:1,
                                    //     message:'Lat Lng lies inside the Zones'
                                    // })
                                }else{
                                    // res.send({
                                    //     response:0,
                                    //     message:'Lat Lng does not lies inside Zones'
                                    // })

                                    reject(buildErrObject(404,'Service not provided'))
                                }
                                // console.log('After For Loop')

                                // res.send({
                                //  response:1,
                                //  data:result
                                // })
                            }else{
                                reject(buildErrObject(404,'Data not found'))
                            }
                        },error=>{
                            console.log('err===========', error)
                        })


                        model.find({
                             // pincode: req.zip_code,
                             deleted_at:'false',
                             status:'active'
                         }).skip(parseInt(req.offset_val)).limit(parseInt(req.limit_val)).then(success=>{
                             if (success.length>0) {
                                 model.countDocuments({
                                     // pincode: req.zip_code,
                                     deleted_at:'false',
                                     status:'active'
                                 }).then(count =>{
                                     resolve({data:success,count:count})
                                 })
                             }else{
                                reject(buildErrObject(404,'Data not found'))
                             }
                         }).catch(err => {
                             console.log('err===========', err)
                         })
                    }else{
                        reject(buildErrObject(404,'Service not provided'))
                    }
                }
                // var lat_ = body.results[0].geometry.location.lat
                // var lng_ = body.results[0].geometry.location.lng
                // resolve(body)
            });
        })
    },

    async getCategoryProductListd(req, model) {
        console.log('model==>', req);
        return new Promise((resolve, reject) => {
            model.find({
                    category_id: req.category_id,
                    store_id: req.store_id,
                    status: "active",
                    deleted_at: "false"
                })
                .populate({
                    path: 'category_id',
                    select: '_id name'
                }).populate({
                    path: 'store_id',
                    select: '_id name'
                }).skip(parseInt(req.offset_val)).limit(parseInt(req.limit_val))
                .then(data => {
                    if (data.length > 0) {
                        model.countDocuments({
                            category_id: req.category_id,
                            store_id: req.store_id,
                            status: "active",
                            deleted_at: "false"
                        }).then(count => {
                            resolve({
                                data: data,
                                count: count
                            })
                        })
                    } else {
                        reject(buildErrObject(404, 'Data not found'))
                    }
                })
        })
    },

    async productInExistingcart(id, model) {
        return new Promise((resolve, reject) => {
            model.findOne({
                product_id: id.product_id,
                user_id: id.user_id
            }, (err, item) => {
                if (item) {
                    resolve(false)
                } else {
                    resolve(true)

                }
            })
        })
    },

    async GetCartItems(id, model) {
        return new Promise((resolve, reject) => {
            model.find({
                    user_id: id
                }).populate({
                    path: 'product_id',
                    populate: {
                        path: 'store_id',
                        select: '_id name service_charge deleviry_charge'
                    }

                }, ).sort({
                    'createdAt': -1
                })
                .then(success => {
                    if (success.length > 0) {
                        resolve(success)
                    } else {
                        resolve(false)
                    }
                })
        })
    },

    async GetProductItems(id, model) {
        return new Promise((resolve, reject) => {
            model.findOne({
                    _id: id
                }).populate({
                    path: 'store_id',
                    populate: {
                        path: 'store_id',
                        select: '_id name'
                    }

                }, ).sort({
                    'createdAt': -1
                })
                .then(success => {
                    console.log("success====>", success);
                    if (success != null) {
                        resolve(success)
                    } else {
                        resolve(false)
                    }
                })
        })
    },


async getSearchItemPagination(req, model) {
    console.log('model==>', req);
    return new Promise((resolve, reject) => {
        model.find({
            deleted_at: 'false',
            status: 'active',
            $or: [{
                    name: {
                        $regex: '.*' + req.search + '.*',
                        $options: 'i'
                    },
                },
                //   {
                //    pincode: {
                //     $regex: '.*' + parseInt(req.search) + '.*',
                //     $options: 'i'
                //   },
                // }
            ],

        }).skip(parseInt(req.offset_val)).limit(parseInt(req.limit_val)).then(success => {
            if (success.length > 0) {
                model.countDocuments({
                    deleted_at: 'false',
                    status: 'active',
                    $or: [{
                            name: {
                                $regex: '.*' + req.search + '.*',
                                $options: 'i'
                            },
                        },
                        //   {
                        //    pincode: {
                        //     $regex: '.*' + parseInt(req.search) + '.*',
                        //     $options: 'i'
                        //   },
                        // }
                    ],
                }).then(count => {
                    resolve({
                        data: success,
                        count: count
                    })
                })
            } else {
                reject(buildErrObject(404, 'Data not found'))
            }
        })
    })
},

	async getItemByEmail(email, model) {
		return new Promise((resolve, reject) => {

			model.findOne({email:email},'password dec_password dob gender address phone name email loginAttempts',(err, item) =>{
        itemNotFound(err, item, reject, 'DATA NOT FOUND')
        console.log(item);
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


}


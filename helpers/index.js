const OrderItem = require("../models/OrderItem");
const Meal = require('../models/Meal');
const Restaurant = require('../models/Restaurant');
const Poll = require('../models/Poll');

const getResponse = (data, message) => {
    return {
        data: data,
        message: message
    }
}

const deleteOrderItems = orderItemIds => {
    return new Promise(async (resolve, reject) => {
        orderItemIds.forEach(async (id, i, arr) => {
            await OrderItem.findByIdAndRemove(id);

            if(arr.length-1 == i){
                resolve('Success');
            }
        });
    });
}

const prepareOrderItems = orderItems => {
    return new Promise((resolve, reject) => {
        if(orderItems.length == 0){
            resolve([]);
        } else {
            let newOrderItems = [];
            orderItems.forEach(async (orderItem, i, arr) => {
                try{
                    if(orderItem.meal != null || orderItem.meal != undefined){
                        const meal = await Meal.findById(orderItem.meal);
        
                        newOrderItems.push({
                            ...orderItem._doc,
                            meal: meal
                        });
                    } else {
                        newOrderItems.push(orderItem._doc);
                    }
    
                    if(arr.length-1 == i){
                        resolve(newOrderItems);
                    }
                } catch(err){
                    console.log(err);
                    reject(err);
                }
            });
        }
    });
}

const getOrderItemList = orderItemIds => {
    return new Promise(async (resolve, reject) => {
        try{
            if(orderItemIds.length == 0){
                resolve([]);
            }
            let orderItems = await OrderItem.find({_id: {$in: orderItemIds}});
            orderItems = await prepareOrderItems(orderItems);

            resolve(orderItems);
        } catch(err){
            console.log(err);
            reject(err);
        }
    });
}

const prepareOrders = async orders => {
    // enrich order object orderItems and meals
    return new Promise(async (resolve, reject) => {
        let newOrders = [];
        for(let i = 0; i < orders.length; i++){
            try{
                // prepare data
                const orderItemList = await getOrderItemList(orders[i].orderItemList);
                let restaurant = await Restaurant.findById(orders[i].restaurantId);
                restaurant = await prepareRestaurants([restaurant]);
                const poll = await Poll.findById(orders[i].pollId);

                newOrders.push({
                    orderItemList,
                    poll: poll,
                    restaurant: restaurant[0],
                    _id: orders[i].id,
                    status: orders[i].status,
                    duration: orders[i].duration,
                    createdAt: orders[i].createdAt
                });
            } catch(err){
                console.log(err);
                reject(err);
            }
        }
        resolve(newOrders);
    });
}

const prepareUsers = users => {
    return new Promise(async (resolve, reject) => {
        let newUsers = [];
        for(let i = 0; i < users.length; i++){
            const orderItems = await getOrderItemList(users[i].history);

            newUsers.push({
                ...users[i]._doc,
                history: orderItems,
                password: null
            });
        }
        resolve(newUsers);
    });
}

const findVotedRestaurant = (votedRestaurants, dbRestaurantId) => {
    // returns true if user voted for this dbRestaurant
    return new Promise((resolve, reject) => {
        votedRestaurants.forEach((votedRestaurant, i, arr) => {
            if(votedRestaurant == dbRestaurantId){
                resolve(true);
            }

            if(arr.length-1 == i){
                resolve(false);
            }
        })
    });
}

const didUserVote = (votes, userId) => {
    // returns true if user already voted
    return new Promise((resolve, reject) => {
        votes.forEach((id, i, arr) => {
            if(id == userId){
                resolve(true)
            }

            if(arr.length-1 == i){
                resolve(false);
            }
        })
    });
}

const checkForVotes = (dbPollRestaurants, votedRestaurants, userId) => {
    // returns updated restaurant list with votes IF user didnt vote, IF user already voted returns 'Voted' string
    return new Promise((resolve, reject) => {
        let newRestaurants = [];
        dbPollRestaurants.forEach(async (dbRestaurant, i, arr) => {
            if(dbRestaurant.votes.length != 0){
                const userAlreadyVoted = await didUserVote(dbRestaurant.votes, userId);
                if(userAlreadyVoted){
                    resolve('Voted')
                }
            }       

            const match = await findVotedRestaurant(votedRestaurants, dbRestaurant.restaurantId);

            if(match){
                let restaurantVotes = dbRestaurant.votes;
                restaurantVotes.push(userId)
                newRestaurants.push({
                    restaurantId: dbRestaurant.restaurantId,
                    votes: restaurantVotes
                });
            } else {
                newRestaurants.push({
                    restaurantId: dbRestaurant.restaurantId,
                    votes: dbRestaurant.votes
                });
            }

            if(arr.length-1 == i){
                resolve(newRestaurants);
            }
        });
    });
}

const preparePollRestaurants = restaurants => {
    return new Promise((resolve, reject) => {
        let newRestaurants = [];
        restaurants.forEach(async (restaurant, i, arr) => {
            try{
                const dbRestaurant = await Restaurant.findById(restaurant.restaurantId);
                
                if(dbRestaurant){
                    newRestaurants.push({
                        restaurant: dbRestaurant._doc,
                        votes: restaurant.votes
                    });
                }
    
                if(arr.length-1 == i){
                    resolve(newRestaurants);
                }
            } catch(err){
                console.log(err);
                reject(err);
            }
        });
    });
}

const preparePolls = polls => {
    // returns ._doc of poll and gets restaurants
    return new Promise((resolve, reject) => {
        let newPolls = [];
        polls.forEach(async (poll, i, arr) => {
            try{
                if(poll.restaurants.length == 0){
                    newPolls.push(poll._doc);
                } else {
                    const pollRestaurants = await preparePollRestaurants(poll.restaurants);
                    
                    newPolls.push({
                        ...poll._doc,
                        restaurants: pollRestaurants
                    });
                }
    
                if(arr.length-1 == i){
                    resolve(newPolls);
                }
            } catch(err){
                console.log(err);
                reject(err);
            }
        });
    });
}

const deleteRestaurantMeals = mealIds => {
    return new Promise((resolve, reject) => {
        mealIds.forEach(async (id, i, arr) => {
            await Meal.findByIdAndRemove(id);

            if(arr.length-1 == i){
                resolve('Success');
            }
        });
    });
}

const getDocMeals = async meals => {
    // returns ._doc of object
    return new Promise((resolve, reject) => {
        let newMeals = [];
        meals.forEach((meal, i, arr) => {
            newMeals.push(meal);
            if(arr.length-1 == i){
                resolve(newMeals);
            }
        })
    })
}

const getMeals = async mealIds => {
    return new Promise(async (resolve, reject) => {
        try{
            // the query will ensure I get only meals with the provided list of ids
            const meals = await Meal.find({_id: {$in: mealIds}});

            if(meals.length == 0){
                resolve([]);
            }

            const filteredMeals = await getDocMeals(meals);
            resolve(filteredMeals);
        } catch(err){
            console.log(err);
            reject(err);
        }
    });
}

const prepareRestaurants = async fetchedRestaurants => {
    // fill meals object with meals
    return new Promise((resolve, reject) => {
        let newRestaurants = [];
        fetchedRestaurants.forEach(async (restaurant, index, arr) => {
            try{
                if(restaurant != null){
                    const meals = await getMeals(restaurant.meals);
                    
                    newRestaurants.push({
                        ...restaurant._doc,
                        meals
                    });
                } else {
                    newRestaurants.push('Doesnt exist');
                }
                
                if(arr.length-1 == index){
                    resolve(newRestaurants)
                }
            } catch(err){
                console.log(err);
                reject(err);
            }
        });
    });
}

const getWinnerRestaurant = restaurants => {
    return new Promise((resolve, reject) => {
        const votes = restaurants.map(r => r.votes.length);
        let maxIndex = 0;
        for(let i = 1; i < votes.length; i++){
            if(votes[i] > votes[maxIndex]){
                maxIndex = i;
            }
        }
        resolve(maxIndex);
    });
}

module.exports = {
    getResponse,
    preparePolls,
    checkForVotes,
    prepareOrders,
    prepareOrderItems,
    getOrderItemList,
    deleteOrderItems,
    prepareRestaurants,
    getMeals,
    deleteRestaurantMeals,
    prepareUsers,
    getWinnerRestaurant
}
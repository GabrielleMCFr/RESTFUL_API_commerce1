require('dotenv').config();

const Pool = require('pg').Pool;
const pool = new Pool ({
    user: process.env.DB_USER,
    host: 'localhost',
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
});
const bcrypt = require("bcrypt");

// helpers

const eraseCartsDetails = (id) => {
  pool.query('DELETE FROM carts_details where cart_id = $1', [id]);
  const newtotal = 0.00;
  pool.query('UPDATE carts SET total = $1 where id = $2', [newtotal, id]);
}

// Users //////////////////////////////////////////////////////////////////////////////////////

//get a single user by id 
const getUserById = (request, response) => {
    const id = parseInt(request.params.user_id)
    if (request.user !== id) {
      response.status(401).send('Not authorized')
    }
    else {
      pool.query('SELECT first_name, last_name, email FROM users WHERE id = $1', [id], (error, results) => {
        if (error) {
          response.status(404).send('Something went wrong')
        }
        else if (typeof results.rows == 'undefined') {
          response.status(404).send('Ressource not found')
        }
        else if (!Array.isArray(results.rows) || results.rows.length < 1) {
          response.status(404).send('User not found')
        }
      else response.status(200).json(results.rows)
      })
    }
  };


// create a new user
const createUser = (request, response) =>  {
    const { first_name, last_name, email, password } = request.body

    bcrypt.genSalt(10, function(crypterr, salt) {
      if (crypterr) {
        response.status(404).send('Cant generate salts');
      }
      bcrypt.hash(password, salt, function(e, hash) {
        if (e) {
          response.status(404).send('hashing error')
        }
        pool.query('INSERT INTO users (first_name, last_name, email, password) VALUES ($1, $2, $3, $4) RETURNING *', [first_name, last_name, email, hash], (error, results) => {
          if (error) {
            response.status(404).send('Invalid user')
          }
    
          else if (!Array.isArray(results.rows) || results.rows.length < 1 || typeof results == 'undefined') {
            response.status(404).send('User not created.')
          }
    
          pool.query('INSERT INTO carts (user_id) VALUES ($1) RETURNING *', [results.rows[0].id], (err, res) => {
          if (err) {
            response.status(404).send('Something went wrong.')
          }
          pool.query('UPDATE users SET cart = $1 WHERE id = $2', [res.rows[0].id, results.rows[0].id], (err, re) => {
            if (err) {
              response.status(404).send('Something went wrong.')
            }
            
            else response.status(201).send(`User added with ID: ${results.rows[0].id}`)
          })
        })
        })
      });
  });
  };


// update a user
const updateUser = (request, response) => {
    const id = parseInt(request.params.user_id)
    if (request.user !== id) {
      response.status(401).send('Not authorized')
    }

    const { first_name, last_name, email} = request.body
  
    pool.query(
      'UPDATE users SET first_name = $1, last_name = $2, email = $3 WHERE id = $4 RETURNING first_name, last_name, email',
      [first_name, last_name, email, id],
      (error, results) => {
        if (error) {
          response.status(404).send('Something went wrong')
        }

        else if (typeof results.rows == 'undefined') {
          response.status(404).send('Ressource not found')
        }
        else if (!Array.isArray(results.rows) || results.rows.length < 1) {
          response.status(404).send('User not updated')
        }
       
        else response.status(200).json(results.rows)
        
      }
    )
  };

const changePassword = (request, response) => {
  const id = request.params.user_id;
  if (request.user && request.user == id) {
    const {password} = request.body
    bcrypt.genSalt(10, function(crypterr, salt) {
      if (crypterr) {
        response.status(404).send('Cant generate salts');
      }
      bcrypt.hash(password, salt, function(e, hash) {
        if (e) {
          response.status(404).send('hashing error')
        }
        else {
          pool.query(
            'UPDATE users SET password = $1 WHERE id = $2 RETURNING first_name, last_name, email',
            [hash, request.user],
            (error, results) => {
              if (error) {
                response.status(404).send('Something went wrong')
              }
      
              else if (typeof results.rows == 'undefined') {
                response.status(404).send('Ressource not found')
              }
              else if (!Array.isArray(results.rows) || results.rows.length < 1) {
                response.status(404).send('Password not updated')
              }
             
              else response.status(200).send('Password updated')
              
            }
          )
        } 
      })
    })
  }
  

};

// delete a user
const deleteUser = (request, response) => {
    const id = parseInt(request.params.user_id);

    if (request.user !== id) {
      response.status(401).send('Not authorized')
    }
  
    pool.query('DELETE FROM users WHERE id = $1 RETURNING $1', [id], (error, results) => {
      if (error) {
        response.status(404).send('User not deleted, something went wrong.')
      }

      else response.status(204).send(`User deleted with ID: ${id}`)
    })
  }

  // log a user
  const logUser = (request, response) => {
    const { email, password } = request.body

    pool.query('SELECT id, password FROM users where email = $1 and password= $2', [email, password], (err, res) => {
      if (err) {
        response.status(404).send('User cant be found')
      }
      else if (typeof res.rows == 'undefined') {
        response.status(404).send('Ressource not found')
      }
      else if (!Array.isArray(res.rows) || res.rows.length < 1) {
        response.status(404).send('User not found')
      }
    else {
      response.status(200).json(res.rows)}
    })
  }

    // get repertory of a User
    const getRepertory = (request, response) => {
      const id = parseInt(request.params.user_id)

      pool.query('SELECT * FROM addresses JOIN repertory ON addresses.id = repertory.address_id WHERE repertory.user_id = $1', [id], (error, results) => {
        if (error) {
          response.status(404).send('Something went wrong')
        }
        else if (typeof results.rows == 'undefined') {
          response.status(404).send('Ressource not found')
        }
        else if (!Array.isArray(results.rows) || results.rows.length < 1) {
          response.status(404).send('Repertory not found')
        }
      else response.status(200).json(results.rows)
        
      })
    }

    // let user add an address
    const addAddress = (request, response) => {
      const id = parseInt(request.params.user_id);
      const { number, street, city, code, phone, country} = request.body

      // check if user exists
      pool.query('SELECT * from users where id= $1', [id], (e, r) => {
        if (e) {
          response.status(404).send('Something went wrong or user not found')
        }

        else if (typeof r.rows == 'undefined' || !Array.isArray(r.rows) || r.rows.length < 1) {
          response.status(404).send('User not found')
        }

        else {
          // add the address
          pool.query('INSERT INTO addresses (number, street, city, code, phone, country) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [number, street, city, code, phone, country], (error, results) => {
            if (error) {
              response.status(404).send('Something went wrong')
            }
            else if (typeof results.rows == 'undefined' || !Array.isArray(results.rows) || results.rows.length < 1) {
              response.status(404).send('Address cant be added')
            }
            else {
              // insert into repertory to link the address to the user
              pool.query('INSERT INTO repertory (user_id, address_id) VALUES ($1, $2) RETURNING *', [id, results.rows[0].id], (err, res) => {
                if (error) {
                  response.status(404).send('Something went wrong')
                }
                else if (typeof results.rows == 'undefined' || !Array.isArray(results.rows) || results.rows.length < 1) {
                  response.status(404).send('Repertory cant be added')
                }
              })
              response.status(201).send(`Address created with ID: ${results.rows[0].id}`)
            }
          })
        }

      })
    }

    // let user modify an address
    const updateAddress = (request, response) => {
      const user_id = parseInt(request.params.user_id);
      const address_id = parseInt(request.params.address_id)
      const { number, street, city, code, phone, country} = request.body

      // check if address is owned by the user 
      pool.query('SELECT * FROM repertory WHERE user_id = $1 AND address_id = $2', [user_id, address_id], (err, res) => {
        if (err) {
          response.status(404).send('Something went wrong or user doesnt own the address')
        }
        else if (!Array.isArray(res.rows) || res.rows.length < 1 || typeof res.rows == 'undefined') {
          response.status(404).send('User doesnt own the address in their repertory')
        }
        else {
          // modify the address
          pool.query('UPDATE addresses SET number = $1, street = $2, city = $3, code = $4, phone = $5, country =$6 WHERE id = $7 RETURNING *', [number, street, city, code, phone, country, address_id], (error, results) => {
            if (error) {
              response.status(404).send('Something went wrong')
            }
            else if (!Array.isArray(results.rows) || results.rows.length < 1 || typeof results.rows == 'undefined') {
              response.status(404).send('Address not found')
            }
            else {
              response.status(200).send(`Address updated with ID: ${results.rows[0].id}`)
            }
          })
        }
      })
    }

    // let user delete an address
    const deleteAddress = (request, response) => {
      const user_id = parseInt(request.params.user_id);
      const address_id = parseInt(request.params.address_id);

      // check if user own the address or even if the address or the user exists
      pool.query('SELECT * FROM repertory WHERE user_id = $1 AND address_id = $2', [user_id, address_id], (err, res) => {
        if (err) {
          response.status(404).send('Something went wrong or user doesnt own the address')
        }
        else if (!Array.isArray(res.rows) || res.rows.length < 1 || typeof res.rows == 'undefined') {
          response.status(404).send('cant find the address in the user s repertory')
        }
        else {
          // modify the address
          pool.query('DELETE FROM addresses where id = $1', [address_id], (error, results) => {
            if (error) {
              response.status(404).send('Something went wrong')
            }
            else {
              response.status(200).send(`Address updated with ID: ${results.rows[0].id}`)
            }
          })
        }
      })
    }


  // cart queries ////////////////////////////////////////////////////////////////////////////////////////////////////////////



  const getCart = (request, response) => {

    if (request.user) {
      // retrieve the user cart
      const id = parseInt(request.user)
      pool.query('SELECT cart from users where id = $1', [id], (err, results) => {
        if (err) {
          response.status(404).send(err)
        }
        else if (!Array.isArray(results.rows) || typeof results.rows == 'undefined') {
          response.status(404).send('Unknown user id')
        }
        else if (results.rows.length < 1) {
          // create a new cart
          pool.query('INSERT INTO carts (user_id) VALUES ($1) RETURNING *', [id], (er, re) => {
            if (er) {
              response.status(404).send('Something went wrong')
            }
            else if (!Array.isArray(re.rows) || typeof re.rows == 'undefined') {
              response.status(404).send('Impossible to create new cart')
            }
            else {
              response.status(200).json(re.rows)
            }
          })
          
        }
        else {
          // grab a cart
          pool.query('select * from carts_details where cart_id = $1', [results.rows[0].cart], (e, r) => {
            if (e) {
              response.status(404).send('Something went wrong')
            }
            else if (!Array.isArray(r.rows) || typeof r.rows == 'undefined') {
              response.status(404).send('Impossible to fetch cart')
            }
            
            else {
              response.status(200).json(r.rows);
            }
          })    
        }
      })
    }

    // for now i don't implement guest carts
    else {
      response.redirect('/')
    }

    /* if user is a guest
    else {
      // use a guest cart.
      console.log('guest cart')
      response.status(200).send(request.session.cart)
    }
    */
  }


  const addToCart = (request, response) => {
    // if logged user
    if (request.user) {
      const { product_id, quantity} = request.body
      const prod_id = request.params.product_id
      const id = parseInt(request.user)

      if (prod_id != product_id) {
        response.status(404).send('Items dont match.')
      }
      pool.query('SELECT cart from users where id = $1', [id], (err, results) => {
        if (err) {
          response.status(404).send(err)
        }
        else if (!Array.isArray(results.rows) || typeof results.rows == 'undefined' || results.rows.length < 1) {
          response.status(404).send('Unknown user and/or cart')
        }
        else {
          // check if it already exists in the cart (normally no, but just in case...)
          pool.query('SELECT * from carts_details where cart_id = $1 AND product_id = $2', [results.rows[0].cart, product_id], (err, res) => {
           
            if (err || !Array.isArray(res.rows) || typeof res.rows == 'undefined') response.status(404).send('Something went wrong with checking if it exists')
            if (res.rows.length < 1) {

              // get price from the db
              // grab unit price 
              pool.query('select price from products where id = $1', [product_id], (e, r) => {
                if (e) response.status(404).send('Something went wrong with prod id');
                else if (!Array.isArray(r.rows) || typeof r.rows == 'undefined' || r.rows.length < 1) {
                  response.status(404).send('Error in fetching')
                }
                else {
                  // get total (seems more secure than fetching it client side)
                  const newtotal = parseFloat(r.rows[0].price) * parseInt(quantity);

                  // add item
                  // then there isnt any quantity of this item, add it
                  pool.query('insert into carts_details (cart_id, product_id, quantity, total) VALUES ($1, $2, $3, $4) RETURNING *', [results.rows[0].cart, product_id, quantity, newtotal], (er, re) => {
                    if (er) {
                      response.status(404).send('Something weng wrong with adding item')
                    }
                    else if (!Array.isArray(re.rows) || typeof re.rows == 'undefined' || re.rows.length < 1) {
                      response.status(404).send('Error in addition to cart')
                    }
                    else response.status(200).send('Item added.')
                  })
                }
              })
              
              
            }
            else {
              // else just up the quantity
              const newQuantity = parseInt(quantity) + parseInt(res.rows[0].quantity);
              let unitPrice = parseFloat(res.rows[0].total) / parseInt(res.rows[0].quantity);
              unitPrice = unitPrice.toFixed(2);
              let newTotal = newQuantity * unitPrice;
              newTotal = newTotal.toFixed(2);
              pool.query('UPDATE carts_details SET quantity = $1, total = $2 WHERE cart_id = $3 AND product_id = $4 returning *', [newQuantity, newTotal, res.rows[0].cart_id, product_id], (e, r) => {
                if (e) response.status(404).send('Something went wrong with updating');
                else if (!Array.isArray(r.rows) || typeof r.rows == 'undefined' || r.rows.length < 1) {
                  response.status(404).send('Error in updating the product')
                }
                else {
                  
                  response.status(200).send('Quantity upped.')
                }
              })
            }
          })

        }
      })
    }
    // for now I wont implement guest carts
    else {
      response.redirect('/')
    }

    /* if guest
    else {
      const { product_id, quantity, total} = request.body

      // if item doesnt already exists
      if (! request.session.cart.product_id) {
        request.session.cart = {
          ... request.session.cart,
          [product_id]: { product_id: product_id, quantity: quantity, total: total}
        }
      }
      // if item already exists in the cart, just add the quantity
      else {     
      }    
     request.session.save(function (err, sessionCart) {
        if (err) response.status(404).send('Error')
        response.status(200).json(request.session.cart)
      })
    }
    */
  }

  const deleteFromCart = (request, response) => {
    if (request.user) {
      const product_id = request.params.product_id;
      const user_id = parseInt(request.user)
      
      // check if the product exists in the users cart
      pool.query('select product_id, cart_id from carts_details join carts on carts.id = carts_details.cart_id where carts.user_id = $1 and carts_details.product_id = $2', [user_id, product_id], (err, res) => {
        if (err) response.status(404).send(' Error: Item cant be found.')
        else if (!Array.isArray(res.rows) || typeof res.rows == 'undefined' || res.rows.length < 1) response.status(404).send('Item cant be deleted')
        else {
          pool.query('DELETE FROM carts_details where product_id = $1 AND cart_id = $2', [product_id, res.rows[0].cart_id], (e, r) => {
            if (e) response.status(404).send('Item cant be removed.')
            else response.status(204).send('Item deleted.')
          })
        }
      })
    }
  };

  const updateCart = (request, response) => {
    if (request.user) {
      const {product_id, quantity} = request.body;
      const user_id = parseInt(request.user);
      // check if the product exists in the users cart
      pool.query('select product_id, cart_id from carts_details join carts on carts.id = carts_details.cart_id where carts.user_id = $1 and carts_details.product_id = $2', [user_id, product_id], (err, res) => {
        if (err) response.status(404).send(' Error: Item cant be found')
        else if (!Array.isArray(res.rows) || typeof res.rows == 'undefined' || res.rows.length < 1) response.status(404).send('Item cant be updated.')
        else {
          // now select total 
          pool.query('select price from products where id = $1', [product_id], (error, results) => {
            if (error || !Array.isArray(results.rows) || typeof results.rows == 'undefined' || results.rows.length < 1) response.status(404).send('Cant fetch price.')
            else {
              const unitPrice = parseFloat(results.rows[0].price);
              let newTotal = unitPrice * parseInt(quantity);
              newTotal = newTotal.toFixed(2);
              pool.query('UPDATE carts_details SET quantity = $3, total = $4 where product_id = $1 AND cart_id = $2 RETURNING *', [product_id, res.rows[0].cart_id, quantity, newTotal], (e, r) => {
                if (e) response.status(404).send('Item cant be removed.')
                else if (!Array.isArray(r.rows) || typeof r.rows == 'undefined' || r.rows.length < 1) response.status(404).send('Item cant be deleted')
                else response.status(200).json(r.rows)
              })
            }
          });      
        }
      })
    }
  };


  // ORDERS //////////////////////////////////////////////////////

  const getOrders = (request, response) => {
    const id = request.params.user_id;
    // check if the user logged in is the user is the query params
    if (request.user == id) {
      pool.query('select * from orders where user_id = $1', [id], (error, results) => {
        if (error || !Array.isArray(results.rows) || typeof results.rows == 'undefined') {
          return response.status(404).send('Cant retrieve orders.')
        }
        else if (results.rows.length < 1) {
          return response.status(200).send('No orders yet.')
        }
        else {
          return response.status(200).json(results.rows)
        }
      })
    }
    else {
      response.status(401).send('Not authorized')
    }
  };

  const getOrder = (request, response) => {
    if (request.user) {
      const order_id = request.params.order_id
      pool.query('SELECT * from orders_details JOIN orders on orders_details.order_id = orders.id where orders.user_id = $1 AND orders.id = $2', [request.user, order_id], (error, results) => {
        if (error || !Array.isArray(results.rows) || typeof results.rows == 'undefined') {
          return response.status(404).send('Cant retrieve order.')
        }
        else if (results.rows.length < 1) {
          return response.status(200).send('Cant retrieve order contents.')
        }
        else {
          return response.status(200).json(results.rows)
        }
      })
    }

    else {
      response.status(401).redirect('/');
    }
  };

  const checkout = (request, response) => {
    const {cart_id, deliveryAddress_id, invoiceAddress_id} = request.body;
    if (request.user) {
      // check if the cart is owned by the user
      pool.query('SELECT cart from users where id = $1 and cart = $2', [request.user, cart_id], (error, results) => {
        if (error || !Array.isArray(results.rows) || typeof results.rows == 'undefined') {
          return response.status(404).send('Cant checkout, something went wrong.')
        }
        else if (results.rows.length < 1) {
          return response.status(401).send('Not authorized')
        }
        else {
         // get total
         pool.query('select sum(total) as total from carts_details group by cart_id having cart_id = $1', [cart_id], (err, res) => {
          if (err || !Array.isArray(res.rows) || typeof res.rows == 'undefined' || res.rows.length < 1) {
            return response.status(404).send('Cant create a new order - cant get total of items')
          }
          else {
            const total = parseFloat(res.rows[0].total).toFixed(2);
            // create an order
           pool.query('INSERT INTO orders (user_id, delivery_address_id, invoice_address_id, total) VALUES ($1, $2, $3, $4) RETURNING *', [request.user, deliveryAddress_id, invoiceAddress_id, total], (error, results) => {
            if (error || !Array.isArray(results.rows) || typeof results.rows == 'undefined' || results.rows.length < 1) {
              return response.status(404).send('Cant create a new order')
            }
            else {
              // copy the details of the cart into the order
              pool.query('INSERT INTO orders_details (order_id, product_id, quantity, total) SELECT $1, product_id, quantity, total FROM carts_details WHERE cart_id = $2 RETURNING *', [results.rows[0].id, cart_id], (e, r) => {
                if (error || !Array.isArray(results.rows) || typeof results.rows == 'undefined' || results.rows.length < 1) {
                  return response.status(404).send('Cant fill the orders details')
                }
                else {
                  eraseCartsDetails(cart_id);
                  return response.status(200).send('Order completed.')
                }
              })
            }
           })

          }
         } )
           
        }
      })
    }
    else {
      response.status(401).redirect('/');
    }
  };

  const getProduct = (request, response) => {
    const product_id = request.params.product_id;

    pool.query('SELECT * from products where id = $1', [product_id], (error, results) => {
      if (error || !Array.isArray(results.rows) || typeof results.rows == 'undefined' || results.rows.length < 1) {
        response.status(404).send('Product unknown.')
      }
      else {
        response.status(200).json(results.rows)
      }
    })
  };


  const getProducts = (request, response) => {
    // if there's a filter
    if (request.query.category) {
      pool.query('SELECT * from products JOIN categories ON products.categ_id = categories.id where categories.name = $1', [request.query.category], (error, results) => {
        if (error || !Array.isArray(results.rows) || typeof results.rows == 'undefined' || results.rows.length < 1) {
          response.status(404).send('Oops, something went wrong.')
        }
        else {
          response.status(200).json(results.rows)
        }
      })
    }
    // if there's no filter
    else {
      pool.query('SELECT * from products', (error, results) => {
        if (error || !Array.isArray(results.rows) || typeof results.rows == 'undefined' || results.rows.length < 1) {
          response.status(404).send('Oops, something went wrong.')
        }
        else {
          response.status(200).json(results.rows)
        }
      })
    }
  }


  module.exports = {
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    getRepertory,
    logUser,
    addAddress,
    updateAddress,
    deleteAddress,
    getCart,
    addToCart,
    deleteFromCart,
    updateCart,
    getOrders,
    getOrder,
    checkout,
    getProduct,
    getProducts,
    changePassword
  };
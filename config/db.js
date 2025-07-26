import mongoose from "mongoose";

let cashed = global.mongoose;

if(!cashed) {
    cashed  = global.mongoose = {conn: null, promise: null};
}

async function connectDB() {

    if(cashed.conn){
        return cashed.conn;
    }

    if(!cashed.promise){
        const opts = {
            bufferCommands: false,
        }

        cashed.promise = mongoose.connect(`${process.env.MONGODB_URI}/quickcart`, opts)
        .then(mongoose => {
            return mongoose;
        })
    }

    cashed.conn = await cashed.promise;
    return cashed.conn;
}

export default connectDB;
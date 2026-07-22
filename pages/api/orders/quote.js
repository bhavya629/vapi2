import { allowMethods, requireCustomer, sendError } from "@/server/http/customerApi";
import { OrderError, quoteOrder } from "@/server/orders/orderService";
export default async function handler(req,res){if(!allowMethods(req,res,["POST"]))return;const user=await requireCustomer(req,res);if(!user)return;try{return res.json({success:true,data:await quoteOrder(user.id,req.body)})}catch(e){if(e instanceof OrderError)return sendError(res,e.status,e.code,e.message,e.details);console.error("quote api",e);return sendError(res,500,"INTERNAL_ERROR","Unable to quote order.")}}

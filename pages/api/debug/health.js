export default function handler(_req,res){res.status(200).json({ok:true,service:'caburee',now:new Date().toISOString()})}

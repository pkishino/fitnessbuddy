<?php 
	require __DIR__ . '/vendor/autoload.php';
	use Facebook\FacebookSession;
	use Facebook\FacebookRequest;
	FacebookSession::setDefaultApplication( '1379990932330458','7056f9ea09d85dd3df918cccd0272968' );
	$access_token= '1379990932330458|3ZsNwYhOmtlFNPnZzTnvLcxyyvQ';
	$session = new FacebookSession($access_token);
	$postdata = file_get_contents("php://input");
    $request = json_decode($postdata);
    @$event = $request->event;
    if(!is_null($event)){
    	$time = $event->date/1000;
	    $dt = new DateTime("@$time");
	    $id = $event->{'$id'};
		$request = new FacebookRequest(  
		$session,  
		'POST',  
		'/app/objects/fitness-buddy:event', 
		array(
		    'access_token' => $access_token,
		    'object' => json_encode(array(
		        'app_id' => '1379990932330458',
	            'url' => "https://patrickziegler.se/fitnessbuddy/?event=$id",
	            'title' => $event->name,
	            'image' => 'https://patrickziegler.se/fitnessbuddy/images/Fitnessbuddy_logo.png',
	            'description' => $dt->format('Y-m-d H:i:s') . '@' .$event->marker->name
		        ))
		)
		);
		try {
			$response = $request->execute();
			$obj = $response->getGraphObject();
			echo $obj->getProperty('id');
		} catch (Exception $e) {
			echo $e;
		}
	}else{
		var_dump(get_object_vars($event));	
	}
 ?>
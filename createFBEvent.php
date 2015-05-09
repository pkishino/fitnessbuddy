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
	$request = new FacebookRequest(  
	$session,  
	'POST',  
	'/app/objects/fitness-buddy:event', 
	array(
	    'access_token' => $access_token,
	    'object' => json_encode(array(
	        'app_id' => '1379990932330458',
	            'url' => 'https://patrickziegler.se/fitnessbuddy/?event=1',
	            'title' => 'Run',
	            'image' => 'https://commons.wikimedia.org/wiki/File%3AFitnessbuddy_logo.png',
	            'description' => 'Running with friends'
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
 ?>